import { SttProvider, LiveSttConnection, SttOptions } from '../../interfaces/stt';
/**
 * Deepgram STT Provider.
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
