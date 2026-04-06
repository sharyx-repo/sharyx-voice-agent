"use strict";
/**
 * Sharyx Voice Agent SDK
 * Build AI voice agents in 5 lines of code.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockTTS = exports.MockSTT = exports.MockLLM = exports.ElevenLabsTTS = exports.GeminiLLM = exports.OpenAILLM = exports.DeepgramSTT = exports.Pipeline = exports.VoiceAgent = exports.createAgent = void 0;
// === TIER 1: Simple API (what 90% of people use) ===
var simple_1 = require("./core/simple");
Object.defineProperty(exports, "createAgent", { enumerable: true, get: function () { return simple_1.createAgent; } });
// === TIER 2: Advanced API (power users) ===
var voice_agent_1 = require("./core/voice-agent");
Object.defineProperty(exports, "VoiceAgent", { enumerable: true, get: function () { return voice_agent_1.VoiceAgent; } });
var pipeline_1 = require("./core/pipeline");
Object.defineProperty(exports, "Pipeline", { enumerable: true, get: function () { return pipeline_1.Pipeline; } });
// === Built-in Providers (no extra installs) ===
var deepgram_1 = require("./providers/stt/deepgram");
Object.defineProperty(exports, "DeepgramSTT", { enumerable: true, get: function () { return deepgram_1.DeepgramSTT; } });
var openai_1 = require("./providers/llm/openai");
Object.defineProperty(exports, "OpenAILLM", { enumerable: true, get: function () { return openai_1.OpenAILLM; } });
var gemini_1 = require("./providers/llm/gemini");
Object.defineProperty(exports, "GeminiLLM", { enumerable: true, get: function () { return gemini_1.GeminiLLM; } });
var elevenlabs_1 = require("./providers/tts/elevenlabs");
Object.defineProperty(exports, "ElevenLabsTTS", { enumerable: true, get: function () { return elevenlabs_1.ElevenLabsTTS; } });
// === Mocks (for testing) ===
var mock_llm_1 = require("./providers/llm/mock-llm");
Object.defineProperty(exports, "MockLLM", { enumerable: true, get: function () { return mock_llm_1.MockLLM; } });
var mock_stt_1 = require("./providers/stt/mock-stt");
Object.defineProperty(exports, "MockSTT", { enumerable: true, get: function () { return mock_stt_1.MockSTT; } });
var mock_tts_1 = require("./providers/tts/mock-tts");
Object.defineProperty(exports, "MockTTS", { enumerable: true, get: function () { return mock_tts_1.MockTTS; } });
