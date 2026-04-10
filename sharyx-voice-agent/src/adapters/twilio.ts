import { EventEmitter } from 'events';
import { VoiceAgent } from '../core/voice-agent';
import { TelephonyAdapter } from '../interfaces/adapter';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
import { WebSocket } from 'ws';
import { linear16ToMulaw } from '../utils/audio';

export class TwilioAdapter implements TelephonyAdapter {
  public readonly name = 'twilio';
  private agent?: VoiceAgent;

  register(agent: VoiceAgent): void {
    this.agent = agent;
  }

  setupRoutes(app: any): void {
    /**
     * TwiML Endpoint for Twilio Webhooks
     */
    app.post('/twiml', (req: any, res: any) => {
      res.type('text/xml');
      res.send(`
        <Response>
          <Say>Connecting you to the Sharyx AI.</Say>
          <Connect>
            <Stream url="wss://${req.headers.host}/media-stream" />
          </Connect>
        </Response>
      `);
    });

    /**
     * WebSocket configuration for Twilio Media Streams
     * Note: The actual WebSocketServer handling is typically done in the app server,
     * but we hook into the connection if the server provides it.
     */
    app.on('upgrade', (request: any, socket: any, head: any) => {
        // Shared logic if using the same server
    });
  }

  /**
   * Bridges traditional WebSocket messages to Sharyx Pipeline
   */
  handleWebSocket(ws: WebSocket): void {
    if (!this.agent) throw new Error('TwilioAdapter not registered with an agent');

    console.log('☎️ Twilio Media Stream detected');
    let streamSid: string;

    let audioBuffer = Buffer.alloc(0);
    const FRAME_SIZE = 320; // 20ms of 8kHz Linear16 PCM

    const transport = new class extends EventEmitter implements VoiceTransport {
      sendAudio(payload: string | Buffer) {
        if (ws.readyState === ws.OPEN && streamSid) {
          const newChunk = Buffer.isBuffer(payload) ? payload : Buffer.from(payload, 'base64');
          audioBuffer = Buffer.concat([audioBuffer, newChunk]);

          while (audioBuffer.length >= FRAME_SIZE) {
            const frame = audioBuffer.subarray(0, FRAME_SIZE);
            audioBuffer = audioBuffer.subarray(FRAME_SIZE);

            // Convert L16 -> Mu-law
            const mulawFrame = linear16ToMulaw(frame);
            const base64 = mulawFrame.toString('base64');

            if (Math.random() < 0.05) {
              console.log(`📤 Dispatching Mu-law chunk to Twilio (${base64.length} chars). Buffer: ${audioBuffer.length} bytes.`);
            }
            ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload: base64 } }));
          }
        }
      }
      sendStart() {}
      sendClear() { 
        audioBuffer = Buffer.alloc(0);
        ws.send(JSON.stringify({ event: 'clear', streamSid })); 
      }
      sendMark(name: string) { ws.send(JSON.stringify({ event: 'mark', streamSid, mark: { name } })); }
      hangup() { ws.close(); }
      close() { ws.close(); }
    };

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        console.log(`📥 Twilio Event: ${data.event}`);

        switch (data.event) {
          case 'start':
            console.log('📥 Twilio Start Data:', JSON.stringify(data, null, 2));
            streamSid = data.start.streamSid;
            this.agent!.handleSession(transport, { 
              callSid: streamSid,
              sampleRate: 8000,
              encoding: 'mulaw' // STT hears Mu-law, Cartesia falls back to L16, we convert back to Mu-law
            });
            break;
          case 'media':
            if (Math.random() < 0.01) {
              console.log(`📥 Inbound media payload length: ${data.media.payload.length}`);
            }
            transport.emit('audio', { payload: data.media.payload });
            break;
          case 'stop':
            console.log('📥 Twilio Stop Event received');
            transport.emit('close');
            break;
        }
      } catch (err) {
        console.error('Error in Twilio stream:', err);
      }
    });

    ws.on('close', () => transport.emit('close'));
  }

  async makeCall(to: string, from?: string): Promise<{ callSid: string }> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = from || process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Missing Twilio credentials (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, or TWILIO_PHONE_NUMBER)');
    }

    const answerUrl = process.env.TWILIO_ANSWER_URL || `https://${process.env.NGROK_DOMAIN || 'your-domain'}/twiml`;

    const params = new URLSearchParams();
    params.append('To', to);
    params.append('From', fromNumber);
    params.append('Url', answerUrl);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${Buffer.from(`${accountSid}:${authToken}`).toString('base64')}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data: any = await response.json();

    if (!response.ok) {
      throw new Error(`Twilio API Error: ${data.message || response.statusText}`);
    }

    return { callSid: data.sid };
  }

  async hangup(callSid: string): Promise<void> {
     throw new Error('Remote hangup not yet implemented for TwilioAdapter');
  }
}
