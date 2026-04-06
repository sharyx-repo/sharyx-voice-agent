"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pipeline = void 0;
const stt_1 = require("../interfaces/stt");
const defaults_1 = require("./defaults");
/**
 * The core STT -> LLM -> TTS orchestration engine.
 */
class Pipeline {
    config;
    constructor(config) {
        this.config = config;
    }
    async run(transport, metadata) {
        const session = {
            id: metadata?.callSid || `session_${Date.now()}`,
            history: [],
            isAiSpeaking: false,
            currentTurnId: 0,
            config: { ...defaults_1.DEFAULT_CONFIG, ...this.config.config },
        };
        console.log(`[Pipeline] Starting session: ${session.id}`);
        // Initial messages
        if (this.config.systemPrompt) {
            session.history.push({ role: 'system', content: this.config.systemPrompt });
        }
        const sttStream = this.config.stt.createLiveConnection();
        // 1. Audio input -> STT
        transport.on('audio', (data) => {
            if (data && data.payload) {
                const audioBuffer = Buffer.from(data.payload, 'base64');
                if (sttStream.getReadyState() === 1) {
                    sttStream.send(audioBuffer);
                }
            }
        });
        // 2. STT -> LLM -> TTS
        sttStream.addListener(stt_1.LiveTranscriptionEvents.Transcript, async (data) => {
            const transcript = data.channel?.alternatives?.[0]?.transcript;
            if (!transcript || !data.is_final)
                return;
            console.log(`[Pipeline] User: ${transcript}`);
            // Barge-in check
            if (session.isAiSpeaking && session.config.interruption_mode === 'interrupt') {
                process.stdout.write(' 💥 Interrupted! ');
                transport.sendClear();
                session.isAiSpeaking = false;
                session.currentTurnId++;
            }
            session.history.push({ role: 'user', content: transcript });
            // Generate AI response
            await this.processTurn(session, transport);
        });
        // 3. Initial greeting
        if (this.config.firstMessage) {
            console.log(`[Pipeline] Agent: ${this.config.firstMessage}`);
            session.history.push({ role: 'assistant', content: this.config.firstMessage });
            await this.speak(session, transport, this.config.firstMessage);
        }
        transport.on('close', () => {
            console.log(`[Pipeline] Session ended: ${session.id}`);
            sttStream.finish();
        });
    }
    async processTurn(session, transport) {
        const turnId = ++session.currentTurnId;
        let fullText = '';
        console.log(`[Pipeline] Generating response...`);
        try {
            const chunks = this.config.llm.streamChat(session.history);
            session.isAiSpeaking = true;
            for await (const chunk of chunks) {
                if (turnId !== session.currentTurnId)
                    break; // Interrupted
                if (chunk.text) {
                    fullText += chunk.text;
                    // Speak sentence by sentence if possible (simplified here)
                }
            }
            if (turnId === session.currentTurnId && fullText) {
                session.history.push({ role: 'assistant', content: fullText });
                await this.speak(session, transport, fullText);
            }
        }
        catch (err) {
            console.error(`[Pipeline] Error in processTurn: ${err}`);
        }
        finally {
            if (turnId === session.currentTurnId) {
                session.isAiSpeaking = false;
            }
        }
    }
    async speak(session, transport, text) {
        transport.sendStart();
        const audioChunks = this.config.tts.streamSpeech(text);
        for await (const chunk of audioChunks) {
            transport.sendAudio(chunk.toString('base64'));
        }
        transport.sendMark(`turn_complete_${Date.now()}`);
    }
}
exports.Pipeline = Pipeline;
