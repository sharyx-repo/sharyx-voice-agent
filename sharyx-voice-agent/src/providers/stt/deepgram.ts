import { SttProvider, LiveSttConnection, SttOptions, LiveTranscriptionEvents } from '../../interfaces/stt';
import { EventEmitter } from 'events';

/**
 * Deepgram STT Provider.
 */
export class DeepgramSTT implements SttProvider {
  private sdk: any;

  constructor(private config: { apiKey: string }) {}

  private async getSDK() {
    if (!this.sdk) {
      try {
        // @ts-ignore
        const { createClient } = await import('@deepgram/sdk');
        this.sdk = createClient(this.config.apiKey);
      } catch (err) {
        throw new Error('Deepgram SDK not found. Install it with: npm install @deepgram/sdk');
      }
    }
    return this.sdk;
  }

  createLiveConnection(options?: SttOptions): LiveSttConnection {
    const emitter = new EventEmitter();
    let connection: any;

    const initConnection = async () => {
        const deepgram = await this.getSDK();
        connection = deepgram.listen.live({
            model: options?.model || 'nova-2',
            language: options?.language || 'en-US',
            encoding: options?.encoding === 'mulaw' ? 'mulaw' : 'linear16',
            sample_rate: options?.sampleRate || 16000,
            smart_format: true
        });

        connection.on('results', (data: any) => {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            if (transcript) {
                emitter.emit(LiveTranscriptionEvents.Transcript, {
                    channel: data.channel,
                    is_final: data.is_final
                });
            }
        });

        connection.on('speech_started', () => {
            emitter.emit(LiveTranscriptionEvents.SpeechStarted);
        });

        connection.on('error', (err: any) => {
            emitter.emit(LiveTranscriptionEvents.Error, err);
        });

        connection.on('close', () => {
            emitter.emit(LiveTranscriptionEvents.Close);
        });
    };

    initConnection();

    return {
        send: (audio: Buffer) => connection?.send(audio),
        finish: () => connection?.finish(),
        getReadyState: () => connection?.getReadyState() || 0,
        addListener: (event: string, callback: (...args: any[]) => void) => emitter.addListener(event, callback)
    } as any;
  }
}
