import { LlmProvider, ChatMessage, LlmChunk, LlmOptions } from '../../interfaces/llm';
/**
 * Google Gemini LLM Provider.
 */
export declare class GeminiLLM implements LlmProvider {
    private config;
    private sdk;
    constructor(config: {
        apiKey: string;
        model?: string;
    });
    private getSDK;
    streamChat(messages: ChatMessage[], options?: LlmOptions): AsyncIterable<LlmChunk>;
    chat(messages: ChatMessage[], options?: LlmOptions): Promise<{
        text: string;
        toolCalls?: any[];
    }>;
}
