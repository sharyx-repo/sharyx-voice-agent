"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ElevenLabsTTS = void 0;
/**
 * ElevenLabs TTS Provider.
 */
class ElevenLabsTTS {
    config;
    sdk;
    constructor(config) {
        this.config = config;
    }
    async getSDK() {
        if (!this.sdk) {
            try {
                // @ts-ignore
                const { ElevenLabsClient } = await import('elevenlabs');
                this.sdk = new ElevenLabsClient({ apiKey: this.config.apiKey });
            }
            catch (err) {
                throw new Error('ElevenLabs SDK not found. Install it with: npm install elevenlabs');
            }
        }
        return this.sdk;
    }
    async *streamSpeech(text, options) {
        const elevenlabs = await this.getSDK();
        const voiceId = options?.voiceId || this.config.voiceId || 'JBFucSot9Snd9hQU9nzV'; // default voice
        const audioStream = await elevenlabs.generate({
            stream: true,
            voice: voiceId,
            text: text,
            model_id: options?.model || 'eleven_turbo_v2_5',
            output_format: 'pcm_16000'
        });
        for await (const chunk of audioStream) {
            if (chunk) {
                yield chunk;
            }
        }
    }
}
exports.ElevenLabsTTS = ElevenLabsTTS;
