# Sharyx Voice Agent: The A to Z Guide 🎙️

This guide explains how the Sharyx ecosystem works from the moment a user speaks to the moment the AI responds.

---

## 🏗️ 1. Architecture: The 3-Layer System

Sharyx is built on a modular, 3-layer architecture. This is what makes it "plug-and-play."

### Layer A: The Adapter (The Ear and Mouth)
The **Adapter** is responsible for the connection. It handles how audio gets into the system.
- **Web Adapter**: Uses WebSockets to talk to a browser.
- **Twilio/Plivo Adapter**: Connects to the phone network.
- **Simulator**: Connects to your terminal.

### Layer B: The Pipeline (The Brain)
The **Pipeline** is the conductor. It takes the audio from the Adapter and coordinates the AI process.
- It sends audio to **STT**.
- It sends text to the **LLM**.
- It sends AI text to **TTS**.
- It manages **Barge-in** (knowing when to stop talking if the user interrupts).

### Layer C: The Providers (The Intelligence)
These are the external services that do the heavy lifting.
- **STT**: Deepgram (Fastest speech-to-text).
- **LLM**: OpenAI / Google Gemini (The reasoning engine).
- **TTS**: ElevenLabs / Cartesia (High-quality, low-latency natural voices).

---

## 🎙️ 2. The Voice Life Cycle (End-to-End)

Here is exactly what happens when a user speaks:

1.  **User Speaks**: Raw audio data is sent through the **Adapter**.
2.  **STT Processing**: The **Pipeline** streams this audio to the STT provider.
3.  **Transcript Alert**: As soon as the STT provider detects a finished sentence, it sends back a **Transcript**.
4.  **LLM Reasoning**: The Pipeline takes that transcript and sends it to the **LLM** (e.g., GPT-4).
5.  **Streaming AI**: The LLM starts generating a response. We use **Streaming**, so we don't wait for the whole answer—we get it word-by-word.
6.  **TTS Generation**: The Pipeline sends the AI's words to the **TTS** provider.
7.  **Audio Response**: The TTS provider converts the text to audio, and the **Pipeline** sends that audio back through the **Adapter** for the user to hear.

---

## 🔧 3. Configuration Mastery

You control the entire system through a single `createAgent()` call.

### Where to add API Keys?
You have two options:
1.  **Environment Variables**: Create a `.env` file in your project root.
    ```env
    OPENAI_API_KEY=sk-your-key
    DEEPGRAM_API_KEY=your-key
    ELEVENLABS_API_KEY=your-key
    CARTESIA_API_KEY=your-key
    TWILIO_ACCOUNT_SID=your-key
    PLIVO_AUTH_ID=your-key
    ```
2.  **Code Configuration**: Pass them directly to the function.
    ```javascript
    const agent = createAgent({
      apiKey: 'sk-your-key', // Shorthand for OpenAI
      stt: { apiKey: 'dg-...' },
      tts: { apiKey: '11-...' }
    });
    ```

### Which Model should I use?
In the `createAgent` call, use the `model` property:
- **`gpt-4o-mini`** (Default): Extremely fast and very cheap. Perfect for most voice agents.
- **`gpt-4o`**: Very intelligent, better at complex reasoning but slightly slower.

```javascript
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  model: 'gpt-4o-mini', // 🚀 Fast & Cheap
  systemPrompt: 'You are a helpful assistant.'
});
```

---

## 🧪 4. Testing Your Flow

### Scenario 1: Terminal Chat (Simulator)
Use this for rapid testing of your prompts and logic without needing any audio hardware.
```javascript
agent.chat(); // Opens a chat loop in your terminal
```

### Scenario 2: Web / Telephony Call
To deploy your agent, you simply "handle" a connection from an adapter.
```javascript
// Example using a generic transport
agent.handleSession(transport);
```

---

## ✅ Summary: Why it Works
The "A to Z" flow is **fully automated** within the `sharyx-voice-agent` SDK. Other developers don't have to worry about audio buffers or WebSocket management—they just define the **Prompt** and the **Providers**, and Sharyx handles the rest.
