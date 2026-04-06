export interface MemoryStore {
  /** Get or create a session for a call */
  getSession(sessionId: string): CallSession;

  /** Destroy session data when the call ends */
  deleteSession(sessionId: string): void;
}

export interface CallSession {
  sessionId: string;
  dynamicMemory: Record<string, string>;
  conversationSummary: string;
  messages: MemoryMessage[];
  createdAt: number;
}

export interface MemoryMessage {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}
