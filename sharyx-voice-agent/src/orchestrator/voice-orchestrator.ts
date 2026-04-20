import { BaseOrchestrator } from './base-orchestrator';
import { VoiceTransport, CallMetadata } from '../../interfaces/transport';
import { LiveTranscriptionEvents } from '../../interfaces/stt';
import { ChatMessage } from '../../interfaces/llm';
import { DEFAULT_CONFIG } from '../../core/defaults';
import { IntentDetector } from './intent-detector';

/**
 * Real-time Voice Orchestrator.
 * Manages the streaming loop: Audio -> STT -> LLM -> TTS -> Audio.
 * Handles barge-ins, tool execution, and session persistence.
 */
export class VoiceOrchestrator extends BaseOrchestrator {
    private isRunning = false;

    async run(transport: VoiceTransport, metadata?: CallMetadata) {
        const sessionId = metadata?.callSid || `session_${Date.now()}`;
        console.log(`[Sharyx] 🧠 Orchestrator starting session: ${sessionId}`);
        this.isRunning = true;

        // Persistent Memory Support
        let session: any;
        if (this.config.memory) {
            session = await this.config.memory.getSession(sessionId);
            // Sync config and metadata to the session object
            session.id = sessionId;
            session.config = { ...DEFAULT_CONFIG, ...this.config.config };
            session.metadata = metadata || {};
            session.isAiSpeaking = false;
            session.processingTurn = false;
        } else {
            // Fallback to local session object (legacy)
            session = {
                id: sessionId,
                history: [] as ChatMessage[],
                isAiSpeaking: false,
                currentTurnId: 0,
                config: { ...DEFAULT_CONFIG, ...this.config.config },
                metadata: metadata || {},
                lastProcessedTranscript: '',
                processingTurn: false
            };
        }

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
            if (this.config.memory) {
                await this.config.memory.saveSession(session);
            }
            
            // Telemetry: Start Turn Timer
            const turnStartTime = Date.now();
            if (this.config.telemetry) {
                this.config.telemetry.recordMetric({
                    name: 'stt_latency',
                    value: turnStartTime - (data.start_time || turnStartTime), // Time to reach final transcript
                    unit: 'ms',
                    sessionId: session.id
                });
            }

            session.processingTurn = true;
            try {
                await this.handleResponse(session, transport, turnStartTime);
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

    private async handleResponse(session: any, transport: VoiceTransport, turnStartTime: number) {
        const turnId = ++session.currentTurnId;
        let fullText = '';
        let firstTokenReceived = false;
        
        // Tool accumulation
        const toolCalls: any[] = [];

        const stream = this.config.llm.streamChat(session.history, { tools: this.config.tools });
        session.isAiSpeaking = true;
        let currentSentence = '';

        try {
            for await (const chunk of stream) {
                if (turnId !== session.currentTurnId) break;
                
                // Handle text streaming
                if (chunk.text) {
                    if (!firstTokenReceived) {
                        firstTokenReceived = true;
                        if (this.config.telemetry) {
                            this.config.telemetry.recordMetric({
                                name: 'llm_ttft',
                                value: Date.now() - turnStartTime,
                                unit: 'ms',
                                sessionId: session.id
                            });
                        }
                    }
                    fullText += chunk.text;
                    currentSentence += chunk.text;

                    if (/[.!?\n]/.test(chunk.text)) {
                        const sentenceToSpeak = currentSentence.trim();
                        if (sentenceToSpeak.length > 0) {
                            currentSentence = '';
                            this.speak(session, transport, sentenceToSpeak, turnStartTime).catch(err => {
                                console.error('[VoiceOrchestrator] Async speak error:', err);
                            });
                        }
                    }
                }

                // Handle tool call chunks
                if (chunk.tool_calls) {
                    for (const toolCall of chunk.tool_calls) {
                        const index = toolCall.index ?? 0;
                        if (!toolCalls[index]) {
                            toolCalls[index] = { id: toolCall.id, name: '', arguments: '' };
                        }
                        if (toolCall.function?.name) toolCalls[index].name += toolCall.function.name;
                        if (toolCall.function?.arguments) toolCalls[index].arguments += toolCall.function.arguments;
                    }
                }
            }
        } catch (err: any) {
            this.config.telemetry?.recordError({ provider: 'llm', error: err.message, sessionId: session.id });
            throw err;
        }

        // Finalize sentence if any
        if (turnId === session.currentTurnId && currentSentence.trim().length > 0) {
            await this.speak(session, transport, currentSentence.trim(), turnStartTime);
        }

        // Capture assistant's response in history
        if (fullText) {
            session.history.push({ role: 'assistant', content: fullText });
        }

        // EXECUTE TOOLS if detected
        if (toolCalls.length > 0 && turnId === session.currentTurnId) {
            console.log(`[Sharyx] 🛠️ Executing ${toolCalls.length} tool calls...`);
            
            // Add tool_calls to history first (required by OpenAI/Gemini)
            session.history.push({ 
                role: 'assistant', 
                content: fullText || null, 
                tool_calls: toolCalls.map(tc => ({
                    id: tc.id,
                    type: 'function',
                    function: { name: tc.name, arguments: tc.arguments }
                }))
            });

            for (const toolCall of toolCalls) {
                const tool = this.config.tools?.find(t => t.name === toolCall.name);
                if (tool) {
                    try {
                        const args = JSON.parse(toolCall.arguments || '{}');
                        const result = await tool.handler(args);
                        session.history.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: JSON.stringify(result)
                        });
                    } catch (err: any) {
                        session.history.push({
                            role: 'tool',
                            tool_call_id: toolCall.id,
                            content: `Error: ${err.message}`
                        });
                    }
                }
            }

            // Recursive call to LLM to process tool results
            if (this.config.memory) await this.config.memory.saveSession(session);
            return this.handleResponse(session, transport, turnStartTime);
        }

        if (this.config.memory) await this.config.memory.saveSession(session);
        session.isAiSpeaking = false;
    }

    private async speak(session: any, transport: VoiceTransport, text: string, turnStartTime?: number) {
        transport.sendStart();
        let firstAudioChunkSent = false;
        
        try {
            const audioChunks = this.config.tts.streamSpeech(text, {
                sampleRate: session.metadata?.sampleRate,
                encoding: session.metadata?.encoding
            });
            for await (const chunk of audioChunks) {
                // Telemetry: TTS Time to First Chunk
                if (!firstAudioChunkSent && turnStartTime) {
                    firstAudioChunkSent = true;
                    if (this.config.telemetry) {
                        this.config.telemetry.recordMetric({
                            name: 'tts_latency',
                            value: Date.now() - turnStartTime,
                            unit: 'ms',
                            sessionId: session.id
                        });
                    }
                }
                transport.sendAudio(chunk);
            }
            transport.sendMark(`turn_complete_${Date.now()}`);
        } catch (err: any) {
            this.config.telemetry?.recordError({
                provider: 'tts',
                error: err.message,
                sessionId: session.id
            });
            throw err;
        }
    }
}
