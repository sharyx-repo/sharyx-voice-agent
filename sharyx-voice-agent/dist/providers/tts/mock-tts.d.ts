import { TtsProvider, TtsOptions } from '../../interfaces/tts';
/**
 * A mock TTS provider for offline testing.
 * Returns empty/silent buffers.
 */
export declare class MockTTS implements TtsProvider {
    streamSpeech(text: string, options?: TtsOptions): AsyncIterable<Buffer>;
}
