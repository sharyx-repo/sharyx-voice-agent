import { TtsProvider, TtsOptions } from '../../interfaces/tts';

/**
 * Cartesia TTS Provider.
 * Streams 16kHz PCM audio natively using HTTP fetch.
 */
export class CartesiaTTS implements TtsProvider {
  constructor(private config: { apiKey: string, voiceId?: string }) {}

  async *streamSpeech(text: string, options?: TtsOptions): AsyncIterable<Buffer> {
    const voiceId = options?.voiceId || this.config.voiceId || '694f9389-aac1-45b6-b726-9d9369183238'; // Example default Cartesia voice
    
    const response = await fetch('https://api.cartesia.ai/tts/bytes', {
        method: 'POST',
        headers: {
            'X-API-Key': this.config.apiKey,
            'Cartesia-Version': '2024-06-10',
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            model_id: options?.model || 'sonic-english',
            transcript: text,
            voice: {
                mode: 'id',
                id: voiceId
            },
            output_format: {
                container: 'raw',
                encoding: 'pcm_s16le',
                sample_rate: 16000
            }
        })
    });

    if (!response.ok || !response.body) {
        throw new Error(`Cartesia HTTP error: ${response.status} ${response.statusText}`);
    }

    // Convert fetch ReadableStream to AsyncIterable for Node.js
    // Typescript DOM type: response.body is ReadableStream<Uint8Array>
    // Node 18+ uses standard Web Streams. But we can't easily iterate over the native body 
    // without `for await` unless Node 20+, so safely convert reader.
    const reader = response.body.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            if (value) {
                yield Buffer.from(value);
            }
        }
    } finally {
        reader.releaseLock();
    }
  }
}
