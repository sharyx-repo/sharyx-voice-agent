# Sharyx Voice Agent 🎙️

**Build production-grade AI voice agents in minutes.** Simple, modular, and developer-friendly.

[![npm version](https://img.shields.io/npm/v/sharyx-voice-agent.svg)](https://www.npmjs.com/package/sharyx-voice-agent)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## 🚀 Quick Start (60 Seconds)

The fastest way to start is with our CLI:

```bash
npx create-sharyx-agent my-bot
cd my-bot
npm start
```

## 🧠 Simple Mode API (Zero Config)

Want to test locally without any costs or API keys? Sharyx has built-in **Mock Mode**.

```javascript
const { createAgent } = require('sharyx-voice-agent');

// Starts in Mock Mode if no API key is provided
const agent = createAgent();

// Simulate a conversation in your terminal
agent.simulate("Hello").then(console.log);
```

## 🛠️ Key Features

- **Zero-Config Testing**: Fallback to Mock LLM/STT/TTS for instant local iteration.
- **Provider Agnostic**: Seamlessly switch between OpenAI, Deepgram, and ElevenLabs.
- **Interactive Simulation**: High-performance `.simulate()` and `.chat()` methods for testing logic before telephony setup.
- **Modular Core**: Advanced users can swap transports, adapters, and memory layers.

## 📦 Installation

```bash
npm install sharyx-voice-agent
```

## 📄 License
MIT © 2026 Sharyx
