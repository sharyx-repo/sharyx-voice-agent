import { TtsProvider, TtsOptions } from '../../interfaces/tts';
/**
 * ElevenLabs TTS Provider.
 */
export declare class ElevenLabsTTS implements TtsProvider {
    private config;
    private sdk;
    constructor(config: {
        apiKey: string;
        voiceId?: string;
    });
    private getSDK;
    streamSpeech(text: string, options?: TtsOptions): AsyncIterable<Buffer>;
}
