"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VoiceAgent = void 0;
const events_1 = require("events");
const pipeline_1 = require("./pipeline");
const readline = __importStar(require("readline"));
class VoiceAgent extends events_1.EventEmitter {
    config;
    adapters = [];
    pipeline;
    app;
    constructor(config) {
        super();
        this.config = config;
        this.pipeline = new pipeline_1.Pipeline(this.config);
    }
    /**
     * Register a telephony adapter (plugin).
     */
    use(adapter) {
        adapter.register(this);
        if (this.app) {
            adapter.setupRoutes(this.app);
        }
        this.adapters.push(adapter);
        return this;
    }
    /**
     * Start the HTTP server for telephony webhooks.
     */
    async start(options) {
        if (options?.app) {
            this.app = options.app;
        }
        else {
            try {
                // @ts-ignore
                const express = await import('express');
                this.app = express.default();
            }
            catch {
                throw new Error('Express not found. Install it with: npm install express');
            }
        }
        this.adapters.forEach(adapter => adapter.setupRoutes(this.app));
        const port = options?.port || 3000;
        if (!options?.app) {
            this.app.listen(port, () => {
                console.log(`🎙️ Voice Agent running on port ${port}`);
                this.adapters.forEach(a => console.log(`  📞 ${a.name} adapter ready`));
            });
        }
    }
    /**
     * Enable or disable debug logs.
     */
    debug(enabled) {
        this.config.debug = enabled;
        if (enabled) {
            console.log(`[Sharyx] 🛡️ Debug mode enabled.`);
            console.log(`[Sharyx] 🧠 Provider: ${this.config.llm.constructor.name}`);
        }
        return this;
    }
    /**
     * Main entry point to handle a voice session (from an adapter).
     */
    async handleSession(transport, metadata) {
        return this.pipeline.run(transport, metadata);
    }
    /**
     * Text-based simulation of a conversation.
     * Useful for rapid testing without burning telephony costs.
     */
    async simulate(input) {
        const messages = [
            { role: 'system', content: this.config.systemPrompt || 'You are a helpful voice assistant.' }
        ];
        const transcript = [];
        // Add greeting if provided
        if (this.config.firstMessage) {
            transcript.push({ role: 'agent', text: this.config.firstMessage });
            messages.push({ role: 'assistant', content: this.config.firstMessage });
        }
        const inputs = Array.isArray(input) ? input : [input];
        for (const userText of inputs) {
            if (this.config.debug)
                console.log(`[Sharyx] 🗨️ User Simulation: ${userText}`);
            transcript.push({ role: 'user', text: userText });
            messages.push({ role: 'user', content: userText });
            const response = await this.config.llm.chat(messages, {
                tools: this.config.tools
            });
            if (this.config.debug)
                console.log(`[Sharyx] 🤖 Agent Response: ${response.text}`);
            // Note: Simplistic tool execution for simulation
            // In the real pipeline, it uses ToolExecutor service.
            if (response.toolCalls && response.toolCalls.length > 0) {
                // Simulate tool output for now
                const toolResult = `[Executed tool calls: ${response.toolCalls.length}]`;
                messages.push({ role: 'assistant', content: toolResult });
                transcript.push({ role: 'agent', text: toolResult });
            }
            else {
                messages.push({ role: 'assistant', content: response.text });
                transcript.push({ role: 'agent', text: response.text });
            }
        }
        return {
            text: transcript[transcript.length - 1]?.text || '',
            transcript,
            turns: inputs.length,
            provider: this.config.llm.constructor.name.toLowerCase().replace('llm', '')
        };
    }
    /**
     * Interactive terminal chat.
     */
    async chat() {
        const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
        const firstMsg = this.config.firstMessage || 'Hello! How can I help?';
        console.log(`\n🤖 Agent: ${firstMsg}\n`);
        const messages = [
            { role: 'system', content: this.config.systemPrompt || 'You are a helpful voice assistant.' },
            { role: 'assistant', content: firstMsg }
        ];
        const loop = () => {
            rl.question('You: ', async (input) => {
                if (input.toLowerCase() === '/exit' || input.toLowerCase() === '/quit') {
                    console.log('Exiting chat...');
                    rl.close();
                    return;
                }
                messages.push({ role: 'user', content: input });
                process.stdout.write('\n🤖 Agent: ');
                let fullResponse = '';
                try {
                    const stream = this.config.llm.streamChat(messages, { tools: this.config.tools });
                    for await (const chunk of stream) {
                        if (chunk.text) {
                            process.stdout.write(chunk.text);
                            fullResponse += chunk.text;
                        }
                    }
                    console.log('\n'); // New line after stream ends
                    messages.push({ role: 'assistant', content: fullResponse });
                }
                catch (err) {
                    console.error(`\n❌ LLM Error: ${err}. Falling back to single-shot chat...`);
                    const response = await this.config.llm.chat(messages, { tools: this.config.tools });
                    messages.push({ role: 'assistant', content: response.text });
                    console.log(response.text);
                }
                loop();
            });
        };
        loop();
    }
}
exports.VoiceAgent = VoiceAgent;
