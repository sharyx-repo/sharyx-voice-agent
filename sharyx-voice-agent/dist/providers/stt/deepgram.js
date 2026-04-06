"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepgramSTT = void 0;
const stt_1 = require("../../interfaces/stt");
const events_1 = require("events");
/**
 * Deepgram STT Provider.
 */
class DeepgramSTT {
    config;
    sdk;
    constructor(config) {
        this.config = config;
    }
    async getSDK() {
        if (!this.sdk) {
            try {
                // @ts-ignore
                const { createClient } = await import('@deepgram/sdk');
                this.sdk = createClient(this.config.apiKey);
            }
            catch (err) {
                throw new Error('Deepgram SDK not found. Install it with: npm install @deepgram/sdk');
            }
        }
        return this.sdk;
    }
    createLiveConnection(options) {
        const emitter = new events_1.EventEmitter();
        let connection;
        const initConnection = async () => {
            const deepgram = await this.getSDK();
            connection = deepgram.listen.live({
                model: options?.model || 'nova-2',
                language: options?.language || 'en-US',
                encoding: options?.encoding === 'mulaw' ? 'mulaw' : 'linear16',
                sample_rate: options?.sampleRate || 16000,
                smart_format: true
            });
            connection.on('results', (data) => {
                const transcript = data.channel?.alternatives?.[0]?.transcript;
                if (transcript) {
                    emitter.emit(stt_1.LiveTranscriptionEvents.Transcript, {
                        channel: data.channel,
                        is_final: data.is_final
                    });
                }
            });
            connection.on('speech_started', () => {
                emitter.emit(stt_1.LiveTranscriptionEvents.SpeechStarted);
            });
            connection.on('error', (err) => {
                emitter.emit(stt_1.LiveTranscriptionEvents.Error, err);
            });
            connection.on('close', () => {
                emitter.emit(stt_1.LiveTranscriptionEvents.Close);
            });
        };
        initConnection();
        return {
            send: (audio) => connection?.send(audio),
            finish: () => connection?.finish(),
            getReadyState: () => connection?.getReadyState() || 0,
            addListener: (event, callback) => emitter.addListener(event, callback)
        };
    }
}
exports.DeepgramSTT = DeepgramSTT;
