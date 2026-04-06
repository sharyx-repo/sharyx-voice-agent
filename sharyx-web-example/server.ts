import 'dotenv/config';
import express from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import { createAgent } from 'sharyx-voice-agent';
import { EventEmitter } from 'events';
import path from 'path';

const app = express();
const port = process.env.PORT || 3000;

// 1. Initialize Sharyx Agent
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: 'You are a friendly Sharyx Web Assistant. Help the user with any questions about the SDK.',
  firstMessage: 'Welcome to the Sharyx Web Demo! I am listening. How can I help you?'
});

// Serve the frontend
app.use(express.static(path.join(__dirname, 'public')));

const server = app.listen(port, () => {
  console.log(`🚀 Sharyx Web Demo running at http://localhost:${port}`);
});

// 2. Setup WebSocket Server for Audio Streaming
const wss = new WebSocketServer({ server });

wss.on('connection', (ws: WebSocket) => {
  console.log('🔌 New WebCall connection established');

  /**
   * 🎤 Custom WebSocket Transport
   * This bridges the WebSocket audio to the Sharyx Pipeline
   */
  const transport = new class extends EventEmitter {
    sendAudio(base64: string) { ws.send(JSON.stringify({ event: 'audio', payload: base64 })); }
    sendStart() { ws.send(JSON.stringify({ event: 'start' })); }
    sendClear() { ws.send(JSON.stringify({ event: 'clear' })); }
    sendMark(name: string) { ws.send(JSON.stringify({ event: 'mark', name })); }
  };

  // Receive audio from Browser
  ws.on('message', (message: string) => {
    try {
      const data = JSON.parse(message);
      if (data.event === 'audio') {
        transport.emit('audio', { payload: data.payload });
      }
    } catch (err) {
      console.error('Error parsing WS message:', err);
    }
  });

  // Start the A-to-Z Voice Flow
  agent.handleSession(transport as any);

  ws.on('close', () => {
    console.log('🔌 WebCall disconnected');
    transport.emit('close');
  });
});
