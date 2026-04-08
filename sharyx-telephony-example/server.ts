import 'dotenv/config';
import express from 'express';
import { WebSocketServer } from 'ws';
import { createAgent } from 'sharyx-voice-agent';
import { EventEmitter } from 'events';

const app = express();
const port = process.env.PORT || 8080;

// 1. Initialize Sharyx Agent (Telephony Mode)
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: 'You are a professional receptionist for Sharyx Voice Labs. Handle incoming calls politely.',
  firstMessage: 'Thank you for calling Sharyx Voice Labs. How can I help you today?'
});

// Twilio TwiML Endpoint
app.post('/twiml', (req, res) => {
  res.type('text/xml');
  res.send(`
    <Response>
      <Say>Connecting you to the Sharyx AI.</Say>
      <Connect>
        <Stream url="wss://${req.headers.host}/media-stream" />
      </Connect>
    </Response>
  `);
});

const server = app.listen(port, () => {
    console.log(`📞 Sharyx Telephony Receiver running on port ${port}`);
    console.log(`👉 Set Twilio Webhook to: http://your-ngrok-url.ngrok.io/twiml`);
});

// 2. Setup WebSocket for Twilio Media Streams
const wss = new WebSocketServer({ server, path: '/media-stream' });

wss.on('connection', (ws) => {
  console.log('☎️ Incoming Call Stream detected');

  let streamSid: string;

  /**
   * 🎤 Twilio Media Stream Transport
   * Bridges PSTN audio to the Sharyx Pipeline
   */
  const transport = new class extends EventEmitter {
    sendAudio(base64: string) {
        if (ws.readyState === ws.OPEN && streamSid) {
            ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload: base64 } }));
        }
    }
    sendStart() { /* Twilio specific noise reduction init could go here */ }
    sendClear() { ws.send(JSON.stringify({ event: 'clear', streamSid })); }
    sendMark(name: string) { ws.send(JSON.stringify({ event: 'mark', streamSid, mark: { name } })); }
    hangup() { ws.close(); }
    close(code?: number, reason?: string) { ws.close(code, reason); }
    sendMessage(event: string, data: any) { ws.send(JSON.stringify({ event, ...data })); }
  };

  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      switch (data.event) {
        case 'start':
          streamSid = data.start.streamSid;
          console.log(`📱 Call started: ${streamSid}`);
          // Start Sharyx Pipeline
          agent.handleSession(transport, { callSid: streamSid });
          break;
        case 'media':
          transport.emit('audio', { payload: data.media.payload });
          break;
        case 'stop':
          transport.emit('close');
          break;
      }
    } catch (err) {
      console.error('Error in Twilio stream:', err);
    }
  });

  ws.on('close', () => transport.emit('close'));
});
