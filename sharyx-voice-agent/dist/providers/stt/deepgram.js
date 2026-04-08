"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepgramSTT = void 0;
const stt_1 = require("../../interfaces/stt");
const events_1 = require("events");
/**
 * Deepgram STT Provider.
 * Updated for @deepgram/sdk v5.0.0 which uses:
 *   - DeepgramClient({ apiKey }) constructor
 *   - listen.v1.connect() returns a socket (startClosed=true)
 *   - socket.connect() + socket.waitForOpen() to actually open the WS
 *   - socket.sendMedia() to send audio
 *   - socket.close() to finish
 *   - socket.readyState property (not getReadyState())
 *   - 'message' event for all incoming data (not 'results')
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
                const { DeepgramClient } = await import('@deepgram/sdk');
                this.sdk = new DeepgramClient({ apiKey: this.config.apiKey });
            }
            catch (err) {
                throw new Error('Deepgram SDK not found or failed to initialize. Install it with: npm install @deepgram/sdk');
            }
        }
        return this.sdk;
    }
    createLiveConnection(options) {
        const emitter = new events_1.EventEmitter();
        let connection;
        let isReady = false;
        const initConnection = async () => {
            try {
                const deepgram = await this.getSDK();
                console.log('[DeepgramSTT] Creating live connection...');
                connection = await deepgram.listen.v1.connect({
                    model: options?.model || 'nova-2',
                    language: options?.language || 'en-US',
                    encoding: options?.encoding === 'mulaw' ? 'mulaw' : 'linear16',
                    sample_rate: options?.sampleRate || 16000,
                    smart_format: true,
                    interim_results: true,
                    endpointing: 300
                });
                // Register event handlers BEFORE connecting
                connection.on('open', () => {
                    console.log('[DeepgramSTT] ✅ WebSocket OPEN - ready to receive audio');
                    isReady = true;
                });
                // v5 SDK uses 'message' event for all incoming messages
                connection.on('message', (data) => {
                    // data could be a transcript result or other message
                    if (data?.type === 'Results') {
                        const transcript = data.channel?.alternatives?.[0]?.transcript;
                        if (transcript && transcript.trim() !== '') {
                            console.log(`[DeepgramSTT] Transcript (is_final=${data.is_final}): "${transcript}"`);
                            emitter.emit(stt_1.LiveTranscriptionEvents.Transcript, data);
                        }
                    }
                    else if (data?.type === 'SpeechStarted') {
                        emitter.emit(stt_1.LiveTranscriptionEvents.SpeechStarted);
                    }
                });
                connection.on('error', (err) => {
                    console.error('[DeepgramSTT] ❌ Error:', err);
                    emitter.emit(stt_1.LiveTranscriptionEvents.Error, err);
                });
                connection.on('close', () => {
                    console.log('[DeepgramSTT] WebSocket closed');
                    isReady = false;
                    emitter.emit(stt_1.LiveTranscriptionEvents.Close);
                });
                // NOW actually open the WebSocket connection
                console.log('[DeepgramSTT] Calling connect()...');
                connection.connect();
                // Wait for the socket to be open
                await connection.waitForOpen();
                console.log('[DeepgramSTT] ✅ Connection established and ready!');
            }
            catch (err) {
                console.error('[DeepgramSTT] ❌ Failed to initialize connection:', err);
            }
        };
        initConnection();
        return {
            send: (audio) => {
                if (isReady && connection) {
                    connection.sendMedia(audio);
                }
            },
            finish: () => {
                if (connection) {
                    isReady = false;
                    connection.close();
                }
            },
            getReadyState: () => isReady ? 1 : 0,
            addListener: (event, callback) => emitter.addListener(event, callback)
        };
    }
}
exports.DeepgramSTT = DeepgramSTT;
