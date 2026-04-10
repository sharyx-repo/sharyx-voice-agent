import { EventEmitter } from 'events';
import { WebSocket } from 'ws';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
import { VoiceAgent } from './voice-agent';
import { DEFAULT_CONFIG } from './defaults';
import { ChatMessage } from '../interfaces/llm';
import { LiveTranscriptionEvents } from '../interfaces/stt';
import { VoiceAgentConfig } from './types';

/**
 * TELEPHONY SERVICE
 * Handles outbound call initiation for Plivo and Twilio.
 */
export class TelephonyService {
  constructor(private config: { 
    plivo?: { authId: string, authToken: string, from: string },
    twilio?: { accountSid: string, authToken: string, from: string }
  }) {}

  async initiateOutboundCall(provider: 'plivo' | 'twilio', to: string, answerUrl: string): Promise<{ callSid: string }> {
    if (provider === 'plivo') {
      const { authId, authToken, from } = this.config.plivo || {};
      if (!authId || !authToken || !from) throw new Error('Plivo credentials missing');

      const response = await fetch(`https://api.plivo.com/v1/Account/${authId}/Call/`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${authId}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from,
          to,
          answer_url: answerUrl,
          answer_method: 'POST',
        }),
      });

      const data: any = await response.json();
      if (!response.ok) throw new Error(`Plivo API Error: ${data.error || data.message}`);
      return { callSid: data.request_uuid };
    } else if (provider === 'twilio') {
      const { accountSid, authToken, from } = this.config.twilio || {};
      if (!accountSid || !authToken || !from) throw new Error('Twilio credentials missing');

      const params = new URLSearchParams();
      params.append('To', to);
      params.append('From', from);
      params.append('Url', answerUrl);
      params.append('Method', 'POST');

      const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const data: any = await response.json();
      if (!response.ok) throw new Error(`Twilio API Error: ${data.message || response.statusText}`);
      return { callSid: data.sid };
    } else {
      throw new Error(`Unsupported provider: ${provider}`);
    }
  }
}

/**
 * TELEPHONY CONTROLLERS
 * Handles the HTTP/XML logic for handshakes.
 */
export class TelephonyControllers {
  static generatePlivoXml(streamUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Stream bidirectional="true" sampleRate="8000" encoding="l16">${streamUrl}</Stream>
    <Wait length="3600" />
</Response>`.trim();
  }

  static generateTwilioTwiML(streamUrl: string): string {
    return `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Connect>
        <Stream url="${streamUrl}" />
    </Connect>
</Response>`.trim();
  }
}

/**
 * VOICE PIPELINE SERVICE
 * Orchestrates STT -> LLM -> TTS.
 */
export class VoicePipelineService {
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

      console.log(`[VoicePipeline] 🚀 Starting session: ${session.id}`);

      if (this.config.systemPrompt) {
          session.history.push({ role: 'system', content: this.config.systemPrompt });
      }

      const sttStream = this.config.stt.createLiveConnection({
        sampleRate: metadata?.sampleRate,
        encoding: metadata?.encoding
      });

      transport.on('audio', (data: any) => {
        if (data && data.payload) {
          const audioBuffer = Buffer.from(data.payload, 'base64');
          if (sttStream.getReadyState() === 1) {
            sttStream.send(audioBuffer);
          }
        }
      });

      sttStream.addListener(LiveTranscriptionEvents.Transcript, async (data: any) => {
        const transcript = data.channel?.alternatives?.[0]?.transcript;
        if (!transcript || !data.is_final) return;

        console.log(`[VoicePipeline] User: ${transcript}`);

        if (session.isAiSpeaking && session.config.interruption_mode === 'interrupt') {
          transport.sendClear();
          session.isAiSpeaking = false;
          session.currentTurnId++;
        }

        session.history.push({ role: 'user', content: transcript });
        await this.processTurn(session, transport);
      });

      if (this.config.firstMessage) {
          console.log(`[VoicePipeline] 🤖 Agent Greeting: ${this.config.firstMessage}`);
          session.history.push({ role: 'assistant', content: this.config.firstMessage });
          await this.speak(session, transport, this.config.firstMessage, {
            sampleRate: metadata?.sampleRate,
            encoding: metadata?.encoding
          });
          console.log(`[VoicePipeline] ✅ Agent Greeting finished sending.`);
      }

      transport.on('close', () => {
        console.log(`[VoicePipeline] 🏁 Session ended: ${session.id}`);
        sttStream.finish();
      });
    } catch (err) {
      console.error(`[VoicePipeline] Error:`, err);
    }
  }

  private async processTurn(session: any, transport: VoiceTransport) {
    const turnId = ++session.currentTurnId;
    let fullText = '';

    try {
        const chunks = this.config.llm.streamChat(session.history);
        session.isAiSpeaking = true;

        for await (const chunk of chunks) {
            if (turnId !== session.currentTurnId) break;
            if (chunk.text) fullText += chunk.text;
        }

        if (turnId === session.currentTurnId && fullText) {
            session.history.push({ role: 'assistant', content: fullText });
            await this.speak(session, transport, fullText, {
              sampleRate: session.metadata?.sampleRate,
              encoding: session.metadata?.encoding
            });
        }
    } catch (err) {
        console.error(`[VoicePipeline] processTurn error:`, err);
    } finally {
        if (turnId === session.currentTurnId) session.isAiSpeaking = false;
    }
  }

  private async speak(session: any, transport: VoiceTransport, text: string, options?: { sampleRate?: number; encoding?: string }) {
    transport.sendStart();
    const audioChunks = this.config.tts.streamSpeech(text, {
        sampleRate: options?.sampleRate,
        encoding: options?.encoding
    });
    for await (const chunk of audioChunks) {
        transport.sendAudio(chunk);
    }
    transport.sendMark(`turn_complete_${Date.now()}`);
  }
}
