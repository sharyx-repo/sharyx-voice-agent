import { LlmProvider, ChatMessage, LlmChunk } from '../../interfaces/llm';
/**
 * A mock LLM for offline testing.
 * Returns scripted responses so developers can test their flow
 * without burning any API credits.
 */
export declare class MockLLM implements LlmProvider {
    private scripts;
    constructor(options?: {
        responses?: Record<string, string>;
    });
    streamChat(messages: ChatMessage[]): AsyncIterable<LlmChunk>;
    chat(messages: ChatMessage[]): Promise<{
        text: string;
    }>;
    private getResponse;
}
