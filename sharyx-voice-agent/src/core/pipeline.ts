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
    const session: any = {
      id: metadata?.callSid || `session_${Date.now()}`,
      history: [] as ChatMessage[],
      isAiSpeaking: false,
      currentTurnId: 0,
      config: { ...DEFAULT_CONFIG, ...this.config.config },
    };

    console.log(`[Pipeline] Starting session: ${session.id}`);

    // Initial messages
    if (this.config.systemPrompt) {
        session.history.push({ role: 'system', content: this.config.systemPrompt });
    }

    const sttStream = this.config.stt.createLiveConnection();

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
        console.log(`[Pipeline] Agent: ${this.config.firstMessage}`);
        session.history.push({ role: 'assistant', content: this.config.firstMessage });
        await this.speak(session, transport, this.config.firstMessage);
    }

    transport.on('close', () => {
      console.log(`[Pipeline] Session ended: ${session.id}`);
      sttStream.finish();
    });
  }

  private async processTurn(session: any, transport: VoiceTransport) {
    const turnId = ++session.currentTurnId;
    let fullText = '';

    console.log(`[Pipeline] Generating response...`);

    try {
        const chunks = this.config.llm.streamChat(session.history);
        session.isAiSpeaking = true;

        for await (const chunk of chunks) {
            if (turnId !== session.currentTurnId) break; // Interrupted
            if (chunk.text) {
                fullText += chunk.text;
                // Speak sentence by sentence if possible (simplified here)
            }
        }

        if (turnId === session.currentTurnId && fullText) {
            session.history.push({ role: 'assistant', content: fullText });
            await this.speak(session, transport, fullText);
        }
    } catch (err) {
        console.error(`[Pipeline] Error in processTurn: ${err}`);
    } finally {
        if (turnId === session.currentTurnId) {
            session.isAiSpeaking = false;
        }
    }
  }

  private async speak(session: any, transport: VoiceTransport, text: string) {
    transport.sendStart();
    const audioChunks = this.config.tts.streamSpeech(text);
    for await (const chunk of audioChunks) {
        transport.sendAudio(chunk.toString('base64'));
    }
    transport.sendMark(`turn_complete_${Date.now()}`);
  }
}
