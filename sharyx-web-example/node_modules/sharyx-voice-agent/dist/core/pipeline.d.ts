import { VoiceAgentConfig } from './types';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
/**
 * The core STT -> LLM -> TTS orchestration engine.
 */
export declare class Pipeline {
    private config;
    constructor(config: VoiceAgentConfig);
    run(transport: VoiceTransport, metadata?: CallMetadata): Promise<void>;
    private processTurn;
    private speak;
}
