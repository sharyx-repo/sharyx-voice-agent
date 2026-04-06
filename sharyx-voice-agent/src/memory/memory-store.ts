import { MemoryStore, CallSession } from '../interfaces/memory';

/**
 * Standard in-memory session store.
 * For production, use @sharyx/memory-redis.
 */
export class InMemoryMemoryStore implements MemoryStore {
    private sessions = new Map<string, CallSession>();

    getSession(sessionId: string): CallSession {
        let session = this.sessions.get(sessionId);
        if (!session) {
            session = {
                sessionId,
                dynamicMemory: {},
                conversationSummary: '',
                messages: [],
                createdAt: Date.now()
            };
            this.sessions.set(sessionId, session);
        }
        return session;
    }

    deleteSession(sessionId: string): void {
        this.sessions.delete(sessionId);
    }
}
