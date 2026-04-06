import { SttProvider, LiveSttConnection, SttOptions } from '../../interfaces/stt';
/**
 * A mock STT provider for offline testing.
 */
export declare class MockSTT implements SttProvider {
    createLiveConnection(options?: SttOptions): LiveSttConnection;
}
