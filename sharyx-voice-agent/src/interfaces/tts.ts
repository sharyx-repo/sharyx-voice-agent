export interface TtsOptions {
  voiceId?: string;
  model?: string;
  apiKey?: string;
  speed?: number;
}

export interface TtsProvider {
  /**
   * Stream speech from text.
   */
  streamSpeech(text: string, options?: TtsOptions): AsyncIterable<Buffer>;
}
