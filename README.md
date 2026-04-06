# Sharyx Voice Agent: The Ecosystem 🎙️

Welcome to the **Sharyx Voice Agent** monorepo. This repository contains everything you need to build, test, and scaffold AI-powered voice agents.

## 📂 Project Structure

This repository is split into two main packages:

### 1. [sharyx-voice-agent](./sharyx-voice-agent) (The Core SDK)
The engine that powers the AI voice conversations.
- **Role**: Provides the `VoiceAgent` class and `createAgent` factory.
- **NPM**: `npm install sharyx-voice-agent`

### 2. [create-sharyx-agent](./create-sharyx-agent) (The Scaffolding CLI)
The "magic wand" that sets up a new project in seconds.
- **Role**: Generates a pre-configured folder with templates.
- **Running**: `npx create-sharyx-agent <project-name>`

---

## 🛠️ Local Development

If you want to contribute to the core SDK or add new CLI templates:

1. **Clone the repo**:
   ```bash
   git clone https://github.com/your-username/sharyx-voice-agent.git
   ```

2. **Install Dependencies**:
   ```bash
   cd sharyx-voice-agent
   npm install
   cd ../create-sharyx-agent
   npm install
   ```

3. **Build everything**:
   ```bash
   # From the root folder
   cd sharyx-voice-agent && npm run build
   cd ../create-sharyx-agent && npm run build
   ```

---

## 🚀 Publication
This repo is set up for professional NPM publishing. Each subfolder has its own `package.json` and `.npmignore` to ensure only the built code is uploaded.

## 📄 License
Both the SDK and the CLI are licensed under the **MIT License**.
