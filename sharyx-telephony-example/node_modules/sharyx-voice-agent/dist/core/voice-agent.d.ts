import { EventEmitter } from 'events';
import { VoiceAgentConfig, SimulateResult } from './types';
import { TelephonyAdapter } from '../interfaces/adapter';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
export declare class VoiceAgent extends EventEmitter {
    private config;
    private adapters;
    private pipeline;
    private app;
    constructor(config: VoiceAgentConfig);
    /**
     * Register a telephony adapter (plugin).
     */
    use(adapter: TelephonyAdapter): this;
    /**
     * Start the HTTP server for telephony webhooks.
     */
    start(options?: {
        port?: number;
        host?: string;
        app?: any;
    }): Promise<void>;
    /**
     * Enable or disable debug logs.
     */
    debug(enabled: boolean): this;
    /**
     * Main entry point to handle a voice session (from an adapter).
     */
    handleSession(transport: VoiceTransport, metadata?: CallMetadata): Promise<void>;
    /**
     * Text-based simulation of a conversation.
     * Useful for rapid testing without burning telephony costs.
     */
    simulate(input: string | string[]): Promise<SimulateResult>;
    /**
     * Interactive terminal chat.
     */
    chat(): Promise<void>;
}
