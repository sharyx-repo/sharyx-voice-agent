"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAgent = createAgent;
const voice_agent_1 = require("./voice-agent");
const defaults_1 = require("./defaults");
const openai_1 = require("../providers/llm/openai");
const gemini_1 = require("../providers/llm/gemini");
const deepgram_1 = require("../providers/stt/deepgram");
const elevenlabs_1 = require("../providers/tts/elevenlabs");
const mock_llm_1 = require("../providers/llm/mock-llm");
const mock_stt_1 = require("../providers/stt/mock-stt");
const mock_tts_1 = require("../providers/tts/mock-tts");
/**
 * Simplified factory to create a Voice Agent with minimal configuration.
 */
function createAgent(config = {}) {
    const resolved = resolveProviders(config);
    const agentConfig = {
        stt: resolved.stt,
        llm: resolved.llm,
        tts: resolved.tts,
        systemPrompt: config.systemPrompt || 'You are a helpful voice assistant.',
        firstMessage: config.firstMessage,
        tools: config.tools,
        config: {
            ...defaults_1.DEFAULT_CONFIG,
            ...config.config,
        },
    };
    return new voice_agent_1.VoiceAgent(agentConfig);
}
function resolveProviders(config) {
    // LLM Resolution: config.apiKey > config.llm.apiKey > process.env.OPENAI_API_KEY
    let llm;
    const apiKey = config.apiKey || config.llm?.apiKey || process.env.OPENAI_API_KEY;
    if (config.llm && typeof config.llm.chat === 'function') {
        llm = config.llm;
    }
    else if (apiKey) {
        const provider = config.llm?.provider || 'openai';
        if (provider === 'openai') {
            llm = new openai_1.OpenAILLM({ apiKey, model: config.model || 'gpt-4o-mini' });
        }
        else if (provider === 'gemini') {
            llm = new gemini_1.GeminiLLM({ apiKey, model: config.model });
        }
        else {
            llm = new openai_1.OpenAILLM({ apiKey, model: config.model || 'gpt-4o-mini' });
        }
    }
    else {
        // Zero-config: No key found anywhere
        console.warn(`[Sharyx] ⚠️ No API key found. Falling back to Mock Mode (offline).`);
        console.warn(`         To use real AI, set OPENAI_API_KEY in your .env or pass it to createAgent().`);
        llm = new mock_llm_1.MockLLM();
    }
    // STT Resolution
    let stt;
    if (config.stt && typeof config.stt.createLiveConnection === 'function') {
        stt = config.stt;
    }
    else {
        const sttOptions = config.stt;
        const apiKey = sttOptions?.apiKey || process.env.DEEPGRAM_API_KEY;
        if (apiKey) {
            stt = new deepgram_1.DeepgramSTT({ apiKey });
        }
        else {
            stt = new mock_stt_1.MockSTT();
        }
    }
    // TTS Resolution
    let tts;
    if (config.tts && typeof config.tts.streamSpeech === 'function') {
        tts = config.tts;
    }
    else {
        const ttsOptions = config.tts;
        const apiKey = ttsOptions?.apiKey || process.env.ELEVENLABS_API_KEY;
        if (apiKey) {
            tts = new elevenlabs_1.ElevenLabsTTS({ apiKey, voiceId: config.voice });
        }
        else {
            tts = new mock_tts_1.MockTTS();
        }
    }
    return { stt, llm, tts };
}
