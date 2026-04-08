import { SttProvider, LiveSttConnection, SttOptions } from '../../interfaces/stt';
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
export declare class DeepgramSTT implements SttProvider {
    private config;
    private sdk;
    constructor(config: {
        apiKey: string;
    });
    private getSDK;
    createLiveConnection(options?: SttOptions): LiveSttConnection;
}
