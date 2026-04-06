import { LlmProvider } from '../interfaces/llm';
import { SttProvider } from '../interfaces/stt';
import { TtsProvider } from '../interfaces/tts';
export interface SessionConfig {
    /**
     * Interruption strategy.
     * 'interrupt' - stop AI speech immediately
     * 'ignore'    - don't stop AI speech
     * 'append'    - collect user speech but don't stop AI immediately
     */
    interruption_mode?: 'interrupt' | 'ignore' | 'append';
    /**
     * Minimum number of words from the user before triggering an interruption.
     */
    interruption_threshold?: number;
    /**
     * Minimum duration (ms) of user speech before triggering an interruption.
     */
    interruption_min_duration?: number;
    /**
     * Cooldown (ms) after the AI starts speaking before an interruption is allowed.
     */
    interruption_cooldown?: number;
    /**
     * Time (ms) in silence before playing an idle notification.
     */
    silence_notify_ms?: number;
    /**
     * Total time (ms) in silence before hanging up.
     */
    silence_timeout_ms?: number;
    /**
     * Maximum number of silence warnings before hangup.
     */
    silence_max_tries?: number;
    /**
     * Messages to play when a silence notification is triggered.
     */
    silence_idle_messages?: string[];
    /**
     * Message to play before hanging up due to silence.
     */
    silence_timeout_message?: string;
    /**
     * Limit for the number of chat messages to keep in the conversation history.
     */
    history_limit?: number;
    /**
     * Whether to automatically extract memory from the conversation.
     */
    memory_extraction?: boolean;
    /**
     * Whether to automatically summarize the conversation as it grows.
     */
    summarization?: boolean;
}
export interface VoiceAgentConfig {
    stt: SttProvider;
    llm: LlmProvider;
    tts: TtsProvider;
    systemPrompt?: string;
    firstMessage?: string;
    tools?: any[];
    config?: SessionConfig;
    debug?: boolean;
}
export interface SimpleAgentConfig {
    apiKey?: string;
    systemPrompt?: string;
    firstMessage?: string;
    model?: string;
    voice?: string;
    language?: string;
    tools?: any[];
    stt?: SttProvider | {
        apiKey: string;
        provider?: 'deepgram' | 'sarvam';
    };
    llm?: LlmProvider | {
        apiKey: string;
        provider?: 'openai' | 'gemini';
    };
    tts?: TtsProvider | {
        apiKey: string;
        provider?: 'elevenlabs' | 'cartesia';
    };
    config?: Partial<SessionConfig>;
}
export interface SimulateResult {
    text: string;
    transcript: {
        role: 'user' | 'agent';
        text: string;
    }[];
    turns: number;
    provider: string;
}
