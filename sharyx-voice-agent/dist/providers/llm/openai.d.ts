import { LlmProvider, ChatMessage, LlmChunk, LlmOptions } from '../../interfaces/llm';
/**
 * OpenAI LLM Provider.
 */
export declare class OpenAILLM implements LlmProvider {
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
