"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.InMemoryMemoryStore = void 0;
/**
 * Standard in-memory session store.
 * For production, use @sharyx/memory-redis.
 */
class InMemoryMemoryStore {
    sessions = new Map();
    getSession(sessionId) {
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
    deleteSession(sessionId) {
        this.sessions.delete(sessionId);
    }
}
exports.InMemoryMemoryStore = InMemoryMemoryStore;
