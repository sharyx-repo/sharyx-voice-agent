"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OpenAILLM = void 0;
/**
 * OpenAI LLM Provider.
 */
class OpenAILLM {
    config;
    sdk;
    constructor(config) {
        this.config = config;
    }
    async getSDK() {
        if (!this.sdk) {
            try {
                const { default: OpenAI } = await import('openai');
                this.sdk = new OpenAI({ apiKey: this.config.apiKey });
            }
            catch (err) {
                throw new Error('OpenAI SDK not found. Install it with: npm install openai');
            }
        }
        return this.sdk;
    }
    async *streamChat(messages, options) {
        const openai = await this.getSDK();
        const model = options?.model || this.config.model || 'gpt-4o-mini';
        const completion = await openai.chat.completions.create({
            model,
            messages: messages,
            stream: true,
            temperature: options?.temperature ?? 0.7,
            max_tokens: options?.maxTokens,
            tools: options?.tools
        });
        for await (const chunk of completion) {
            const delta = chunk.choices[0]?.delta;
            if (delta?.content) {
                yield { text: delta.content };
            }
            if (delta?.tool_calls) {
                yield { tool_calls: delta.tool_calls };
            }
        }
    }
    async chat(messages, options) {
        const openai = await this.getSDK();
        const model = options?.model || this.config.model || 'gpt-4o-mini';
        try {
            const completion = await openai.chat.completions.create({
                model,
                messages: messages,
                temperature: options?.temperature ?? 0.7,
                max_tokens: options?.maxTokens,
                tools: options?.tools
            });
            const choice = completion.choices[0]?.message;
            return {
                text: choice?.content || '',
                toolCalls: choice?.tool_calls
            };
        }
        catch (err) {
            if (err.status === 401) {
                console.error(`[Sharyx] ❌ OpenAI Error: Invalid API Key.`);
                console.warn(`         Falling back to Mock Response to prevent crash.`);
                return {
                    text: `[FALLBACK] I heard you say: "${messages[messages.length - 1].content}". (OpenAI Key Invalid)`
                };
            }
            throw err;
        }
    }
}
exports.OpenAILLM = OpenAILLM;
