import { BaseOrchestrator } from './base-orchestrator';
import { VoiceTransport, CallMetadata } from '../../interfaces/transport';
import { LiveTranscriptionEvents } from '../../interfaces/stt';
import { ChatMessage } from '../../interfaces/llm';
import { DEFAULT_CONFIG } from '../../core/defaults';
import { IntentDetector } from './intent-detector';

export class VoiceOrchestrator extends BaseOrchestrator {
    private isRunning = false;

    async run(transport: VoiceTransport, metadata?: CallMetadata) {
        console.log(`[Sharyx] 🧠 Modular Orchestrator 2.0 starting session: ${metadata?.callSid || 'sim_session'}`);
        this.isRunning = true;
        const session: any = {
            id: metadata?.callSid || `session_${Date.now()}`,
            history: [] as ChatMessage[],
            isAiSpeaking: false,
            currentTurnId: 0,
            config: { ...DEFAULT_CONFIG, ...this.config.config },
            metadata: metadata || {},
            lastProcessedTranscript: '',
            processingTurn: false
        };

        const sttStream = this.config.stt.createLiveConnection({
            sampleRate: metadata?.sampleRate,
            encoding: metadata?.encoding
        });

        transport.on('audio', (data: any) => {
            if (this.isRunning && data?.payload) {
                const audioBuffer = Buffer.from(data.payload, 'base64');
                if (sttStream.getReadyState() === 1) {
                    sttStream.send(audioBuffer);
                }
            }
        });

        sttStream.addListener(LiveTranscriptionEvents.Transcript, async (data: any) => {
            const transcript = data.channel?.alternatives?.[0]?.transcript?.trim();
            if (!transcript || !data.is_final) return;

            // Debounce: If this transcript is identical to the last one processed, skip it.
            if (session.lastProcessedTranscript === transcript && !session.processingTurn) return;
            
            // Turn Lock: Prevent overlapping handleResponse calls
            if (session.processingTurn) return;

            // Handle barge-in
            if (session.isAiSpeaking && session.config.interruption_mode === 'interrupt') {
                transport.sendClear();
                session.isAiSpeaking = false;
                session.currentTurnId++;
            }

            session.lastProcessedTranscript = transcript;
            session.history.push({ role: 'user', content: transcript });
            
            session.processingTurn = true;
            try {
                await this.handleResponse(session, transport);
            } finally {
                session.processingTurn = false;
            }
        });

        // Initial Greeting
        if (this.config.firstMessage) {
            session.history.push({ role: 'assistant', content: this.config.firstMessage });
            await this.speak(session, transport, this.config.firstMessage);
        }

        transport.on('close', () => {
            this.stop();
            sttStream.finish();
        });
    }

    async stop() {
        this.isRunning = false;
    }

    private async handleResponse(session: any, transport: VoiceTransport) {
        const turnId = ++session.currentTurnId;
        let fullText = '';

        const stream = this.config.llm.streamChat(session.history, { tools: this.config.tools });
        session.isAiSpeaking = true;
        let currentSentence = '';

        for await (const chunk of stream) {
            if (turnId !== session.currentTurnId) break;
            if (chunk.text) {
                fullText += chunk.text;
                currentSentence += chunk.text;

                if (/[.!?\n]/.test(chunk.text)) {
                    const sentenceToSpeak = currentSentence.trim();
                    if (sentenceToSpeak.length > 0) {
                        currentSentence = '';
                        this.speak(session, transport, sentenceToSpeak).catch(err => console.error('[VoiceOrchestrator] Async speak error:', err));
                    }
                }
            }
        }

        if (turnId === session.currentTurnId) {
            const finalSentence = currentSentence.trim();
            if (finalSentence.length > 0) {
                this.speak(session, transport, finalSentence).catch(err => console.error('[VoiceOrchestrator] Async final speak error:', err));
            }
            if (fullText) {
                session.history.push({ role: 'assistant', content: fullText });
            }
        }
        
        session.isAiSpeaking = false;
    }

    private async speak(session: any, transport: VoiceTransport, text: string) {
        transport.sendStart();
        const audioChunks = this.config.tts.streamSpeech(text, {
            sampleRate: session.metadata?.sampleRate,
            encoding: session.metadata?.encoding
        });
        for await (const chunk of audioChunks) {
            transport.sendAudio(chunk);
        }
        transport.sendMark(`turn_complete_${Date.now()}`);
    }
}
