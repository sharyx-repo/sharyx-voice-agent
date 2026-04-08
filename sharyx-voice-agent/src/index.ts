/**
 * Sharyx Voice Agent SDK
 * Build AI voice agents in 5 lines of code.
 */

// === TIER 1: Simple API (what 90% of people use) ===
export { createAgent } from './core/simple';

// === TIER 2: Advanced API (power users) ===
export { VoiceAgent } from './core/voice-agent';
export { Pipeline } from './core/pipeline';

// === Built-in Providers (no extra installs) ===
export { DeepgramSTT } from './providers/stt/deepgram';
export { OpenAILLM } from './providers/llm/openai';
export { GeminiLLM } from './providers/llm/gemini';
export { ElevenLabsTTS } from './providers/tts/elevenlabs';
export { CartesiaTTS } from './providers/tts/cartesia';

// === Mocks (for testing) ===
export { MockLLM } from './providers/llm/mock-llm';
export { MockSTT } from './providers/stt/mock-stt';
export { MockTTS } from './providers/tts/mock-tts';

// === Interfaces (for writing custom providers) ===
export type { SttProvider, LiveSttConnection, SttOptions } from './interfaces/stt';
export type { LlmProvider, ChatMessage, LlmChunk, LlmOptions } from './interfaces/llm';
export type { TtsProvider, TtsOptions } from './interfaces/tts';
export type { TelephonyAdapter } from './interfaces/adapter';
export type { VoiceTransport, CallMetadata } from './interfaces/transport';
export type { MemoryStore, CallSession, MemoryMessage } from './interfaces/memory';

// === Types ===
export type {
  SimpleAgentConfig,
  VoiceAgentConfig,
  SessionConfig,
  SimulateResult,
} from './core/types';

export type {
  SimpleTool,
  ToolParam
} from './tools/types';
