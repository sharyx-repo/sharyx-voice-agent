import 'dotenv/config';
import express from 'express';
import path from 'path';
import * as fs from 'fs';
import { WebSocketServer } from 'ws';
import { createAgent, TelephonyService, TelephonyControllers } from 'sharyx-voice-agent';

// File-based logging to capture everything
const logFile = path.join(__dirname, 'server_debug.log');
const stream = fs.createWriteStream(logFile, { flags: 'a' });
const originalLog = console.log.bind(console);
const originalError = console.error.bind(console);

console.log = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    stream.write(`[LOG] ${new Date().toISOString()} ${msg}\n`);
    originalLog(...args);
};
console.error = (...args: any[]) => {
    const msg = args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ');
    stream.write(`[ERR] ${new Date().toISOString()} ${msg}\n`);
    originalError(...args);
};

console.log('--- Server Starting Debug Session (Refactored) ---');

const app = express();
const port = process.env.PORT || 8080;

app.use(express.static('public'));
app.use(express.json());

// 1. Initialize Telephony Service
const telephony = new TelephonyService({
  plivo: {
    authId: process.env.PLIVO_AUTH_ID!,
    authToken: process.env.PLIVO_AUTH_TOKEN!,
    from: process.env.PLIVO_PHONE_NUMBER!
  }
});

// Trigger Outbound Call
app.post('/trigger-call', async (req, res) => {
  const { to, provider } = req.body;
  try {
    console.log(`🚀 Triggering outbound call to ${to} via ${provider}...`);
    const domain = process.env.NGROK_DOMAIN || `https://${req.headers.host}`;
    const result = await telephony.initiateOutboundCall(provider as any, to, `${domain}/plivo/xml`);
    res.json({ success: true, callSid: result.callSid });
  } catch (err: any) {
    console.error(`❌ Call Trigger Error: ${err.message}`);
    res.status(500).json({ success: false, error: err.message });
  }
});

// 2. Specialized Plivo Controller
app.post('/plivo/xml', (req, res) => {
  res.type('text/xml');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  let streamUrl = process.env.PLIVO_MEDIA_STREAM_URL || `wss://${host}/plivo-stream`;
  
  if (process.env.WS_SHARED_SECRET) {
    const separator = streamUrl.includes('?') ? '&' : '?';
    streamUrl += `${separator}token=${process.env.WS_SHARED_SECRET}`;
  }

  // Fail-safe: Hardcode l16 until library symlink is confirmed
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" sampleRate="8000" encoding="l16">${streamUrl}</Stream>
    <Wait length="3600" />
</Response>`.trim();
  
  console.log('------------------------------');
  console.log(`✉️ GENERATED PLIVO XML (HARDCODED L16 FIX):\n${xml}`);
  console.log('------------------------------');
  res.send(xml);
});

// Serve UI
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 3. Initialize Sharyx Agent (Brain)
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  stt: { apiKey: process.env.DEEPGRAM_API_KEY!, provider: 'deepgram' },
  tts: { apiKey: process.env.CARTESIA_API_KEY!, provider: 'cartesia' },
  systemPrompt: 'You are a professional receptionist for Sharyx Voice Labs. Handle incoming calls politely.',
  firstMessage: 'Thank you for calling Sharyx Voice Labs. How can I help you today?'
});

// For WebSocket routing, we still need adapters for now or we can use the brain directly
import { TwilioAdapter, PlivoAdapter } from 'sharyx-voice-agent';
const twilio = new TwilioAdapter();
const plivo = new PlivoAdapter();
agent.use(twilio).use(plivo);

const server = app.listen(port, () => {
    const domain = process.env.NGROK_DOMAIN || `http://localhost:${port}`;
    console.log(`📞 Sharyx Telephony Receiver running on port ${port}`);
});

// 4. WebSocket handling
const wss = new WebSocketServer({ noServer: true });

wss.on('connection', (ws, req) => {
    try {
        const url = new URL(req.url || '', `http://${req.headers.host || 'localhost'}`);
        const path = url.pathname;
        
        if (path === (process.env.TWILIO_MEDIA_STREAM_PATH || '/media-stream')) {
            console.log('🤖 Routing to TwilioAdapter');
            twilio.handleWebSocket(ws);
        } else if (path.startsWith('/plivo-stream')) {
            // Verify Shared Secret
            if (process.env.WS_SHARED_SECRET) {
                const token = url.searchParams.get('token');
                if (token !== process.env.WS_SHARED_SECRET) {
                    ws.close(4001, 'Unauthorized');
                    return;
                }
            }
            console.log('🤖 Routing to PlivoAdapter');
            plivo.handleWebSocket(ws);
        }
    } catch (err: any) {
        console.error('❌ Error handling connection:', err.message);
    }
});

server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});
