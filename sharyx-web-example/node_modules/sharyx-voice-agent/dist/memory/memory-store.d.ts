import { MemoryStore, CallSession } from '../interfaces/memory';
/**
 * Standard in-memory session store.
 * For production, use @sharyx/memory-redis.
 */
export declare class InMemoryMemoryStore implements MemoryStore {
    private sessions;
    getSession(sessionId: string): CallSession;
    deleteSession(sessionId: string): void;
}
