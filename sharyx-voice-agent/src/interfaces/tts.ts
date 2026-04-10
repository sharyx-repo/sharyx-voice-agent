export interface TtsOptions {
  voiceId?: string;
  model?: string;
  apiKey?: string;
  speed?: number;
  sampleRate?: number;
  encoding?: string;
}

export interface TtsProvider {
  /**
   * Stream speech from text.
   */
  streamSpeech(text: string, options?: TtsOptions): AsyncIterable<Buffer>;
}
