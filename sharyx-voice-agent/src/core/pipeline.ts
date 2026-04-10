import { VoiceAgentConfig, SessionConfig } from './types';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
import { LiveTranscriptionEvents } from '../interfaces/stt';
import { ChatMessage } from '../interfaces/llm';
import { DEFAULT_CONFIG } from './defaults';

/**
 * The core STT -> LLM -> TTS orchestration engine.
 */
export class Pipeline {
  constructor(private config: VoiceAgentConfig) {}

  async run(transport: VoiceTransport, metadata?: CallMetadata) {
    try {
      const session: any = {
        id: metadata?.callSid || `session_${Date.now()}`,
        history: [] as ChatMessage[],
        isAiSpeaking: false,
        currentTurnId: 0,
        config: { ...DEFAULT_CONFIG, ...this.config.config },
        metadata: metadata || {}
      };

      console.log(`[Pipeline] 🚀 Starting session: ${session.id}`);

      // Initial messages
      if (this.config.systemPrompt) {
          session.history.push({ role: 'system', content: this.config.systemPrompt });
      }

      console.log(`[Pipeline] 🎤 Creating STT connection...`);
      const sttStream = this.config.stt.createLiveConnection({
        sampleRate: metadata?.sampleRate,
        encoding: metadata?.encoding
      });

      // 1. Audio input -> STT
      transport.on('audio', (data: any) => {
        if (data && data.payload) {
          const audioBuffer = Buffer.from(data.payload, 'base64');
          if (sttStream.getReadyState() === 1) {
            sttStream.send(audioBuffer);
          }
        }
      });

      // 2. STT -> LLM -> TTS
      sttStream.addListener(LiveTranscriptionEvents.Transcript, async (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (!transcript || !data.is_final) return;

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
          console.log(`[Pipeline] 🤖 Agent Greeting: ${this.config.firstMessage}`);
          session.history.push({ role: 'assistant', content: this.config.firstMessage });
          try {
              await this.speak(session, transport, this.config.firstMessage, {
                sampleRate: metadata?.sampleRate,
                encoding: metadata?.encoding
              });
              console.log(`[Pipeline] ✅ Agent Greeting finished sending.`);
          } catch (speakErr) {
              console.error(`[Pipeline] ❌ Error in initial speak:`, speakErr);
          }
      }

      transport.on('close', () => {
        console.log(`[Pipeline] 🏁 Session ended: ${session.id}`);
        sttStream.finish();
      });
    } catch (runErr) {
      console.error(`[Pipeline] ❌ CRITICAL Error in Pipeline.run:`, runErr);
    }
  }

  private async processTurn(session: any, transport: VoiceTransport) {
    const turnId = ++session.currentTurnId;
    let fullText = '';
    let currentSentence = '';

    console.log(`[Pipeline] Generating response...`);

    try {
        const chunks = this.config.llm.streamChat(session.history);
        session.isAiSpeaking = true;

        for await (const chunk of chunks) {
            // Safety: If a new turn started (interruption), stop this one
            if (turnId !== session.currentTurnId) break;

            if (chunk.text) {
                fullText += chunk.text;
                currentSentence += chunk.text;

                // Check for sentence boundaries
                if (/[.!?\n]/.test(chunk.text)) {
                    const sentenceToSpeak = currentSentence.trim();
                    if (sentenceToSpeak.length > 0) {
                        currentSentence = ''; // Reset buffer
                        // Speak this sentence immediately and asynchronously
                        // We don't 'await' here so LLM continues generating
                        this.speak(session, transport, sentenceToSpeak, {
                          sampleRate: session.metadata?.sampleRate,
                          encoding: session.metadata?.encoding
                        }).catch(err => console.error('[Pipeline] Async speak error:', err));
                    }
                }
            }
        }

        // Handle any remaining text after the stream ends
        if (turnId === session.currentTurnId) {
            const finalSentence = currentSentence.trim();
            if (finalSentence.length > 0) {
                this.speak(session, transport, finalSentence, {
                  sampleRate: session.metadata?.sampleRate,
                  encoding: session.metadata?.encoding
                }).catch(err => console.error('[Pipeline] Async final speak error:', err));
            }
            
            if (fullText) {
                session.history.push({ role: 'assistant', content: fullText });
            }
        }
    } catch (err) {
        console.error(`[Pipeline] Error in processTurn: ${err}`);
    } finally {
        // Only reset isAiSpeaking if we haven't started a new turn
        if (turnId === session.currentTurnId) {
             // We don't set isAiSpeaking = false immediately because TTS might still be playing
             // But for now, we follow the previous simple logic or rely on marks
        }
    }
  }

  private async speak(session: any, transport: VoiceTransport, text: string, options?: { sampleRate?: number; encoding?: string }) {
    console.log(`[Pipeline] 🔊 Requesting TTS for: "${text.substring(0, 30)}${text.length > 30 ? '...' : ''}"`);
    transport.sendStart();
    const audioChunks = this.config.tts.streamSpeech(text, {
        sampleRate: options?.sampleRate,
        encoding: options?.encoding
    });
    
    let chunkCount = 0;
    for await (const chunk of audioChunks) {
        chunkCount++;
        if (chunkCount === 1) console.log(`[Pipeline] ⚡ First audio chunk received from TTS`);
        transport.sendAudio(chunk);
    }
    console.log(`[Pipeline] ✅ Finished sending ${chunkCount} audio chunks`);
    transport.sendMark(`turn_complete_${Date.now()}`);
  }
}
