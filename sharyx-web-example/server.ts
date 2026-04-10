import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createAgent, WebCallAdapter } from 'sharyx-voice-agent';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// 1. Initialize Sharyx Agent
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  stt: { apiKey: process.env.DEEPGRAM_API_KEY!, provider: 'deepgram' },
  tts: { apiKey: process.env.CARTESIA_API_KEY!, provider: 'cartesia' },
  systemPrompt: 'You are a friendly Sharyx Web Assistant. Help the user with any questions about the SDK.',
  firstMessage: 'Welcome to the Sharyx Web Demo! I am listening. How can I help you?'
});

// 2. Initialize WebCall Adapter
const webcall = new WebCallAdapter();
agent.use(webcall);

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const server = app.listen(port, () => {
  console.log(`🚀 Sharyx Web Demo running at http://localhost:${port}`);
});

// 3. Setup WebSocket Server for Audio Streaming
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 New WebCall connection established');
  webcall.handleWebSocket(ws);

  ws.on('close', () => {
    console.log('🔌 WebCall disconnected');
  });
});