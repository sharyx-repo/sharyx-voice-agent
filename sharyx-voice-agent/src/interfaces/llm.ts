export interface ChatMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string | null;
  name?: string;
  tool_call_id?: string;
  tool_calls?: any[];
}

export interface LlmChunk {
  text?: string;
  tool_calls?: any[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface LlmOptions {
  model?: string;
  apiKey?: string;
  temperature?: number;
  maxTokens?: number;
  tools?: any[];
}

export interface LlmProvider {
  /**
   * Stream a chat completion.
   */
  streamChat(messages: ChatMessage[], options?: LlmOptions): AsyncIterable<LlmChunk>;

  /**
   * Single-shot completion.
   */
  chat(messages: ChatMessage[], options?: LlmOptions): Promise<{ text: string; toolCalls?: any[] }>;
}
