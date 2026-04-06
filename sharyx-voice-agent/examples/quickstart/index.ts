import 'dotenv/config';
import { createAgent } from 'sharyx-voice-agent';

/**
 * 🚀 Quickstart Example
 * Build and test an AI voice agent in 5 lines of code.
 */
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: 'You are a helpful voice assistant.',
  firstMessage: 'Hello! I am your AI voice agent. How can I help you today?'
});

// Run the interactive chat in the terminal
agent.chat();
