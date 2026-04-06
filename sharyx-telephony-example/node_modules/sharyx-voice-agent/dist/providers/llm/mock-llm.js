"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MockLLM = void 0;
/**
 * A mock LLM for offline testing.
 * Returns scripted responses so developers can test their flow
 * without burning any API credits.
 */
class MockLLM {
    scripts;
    constructor(options) {
        this.scripts = new Map(Object.entries(options?.responses || {}));
    }
    async *streamChat(messages) {
        const response = this.getResponse(messages);
        // Simulate streaming by yielding word by word
        for (const word of response.split(' ')) {
            yield { text: word + ' ' };
            await new Promise(r => setTimeout(r, 30)); // Simulate latency
        }
    }
    async chat(messages) {
        return { text: this.getResponse(messages) };
    }
    getResponse(messages) {
        const lastUser = messages.filter(m => m.role === 'user').pop();
        if (!lastUser)
            return 'Hello! How can I help you?';
        const content = lastUser.content || '';
        // Check scripted responses first
        for (const [pattern, response] of this.scripts) {
            if (content.toLowerCase().includes(pattern.toLowerCase())) {
                return response;
            }
        }
        // Generic fallback
        return `I heard you say: "${content}". This is a mock response. ` +
            `Set your OPENAI_API_KEY to get real AI responses.`;
    }
}
exports.MockLLM = MockLLM;
