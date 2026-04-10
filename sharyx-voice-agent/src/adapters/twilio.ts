import { EventEmitter } from 'events';
import { VoiceAgent } from '../core/voice-agent';
import { TelephonyAdapter } from '../interfaces/adapter';
import { VoiceTransport, CallMetadata } from '../interfaces/transport';
import { WebSocket } from 'ws';

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

    const transport = new class extends EventEmitter implements VoiceTransport {
      sendAudio(base64: string) {
        if (ws.readyState === ws.OPEN && streamSid) {
          ws.send(JSON.stringify({ event: 'media', streamSid, media: { payload: base64 } }));
        }
      }
      sendStart() {}
      sendClear() { ws.send(JSON.stringify({ event: 'clear', streamSid })); }
      sendMark(name: string) { ws.send(JSON.stringify({ event: 'mark', streamSid, mark: { name } })); }
      hangup() { ws.close(); }
      close() { ws.close(); }
    };

    ws.on('message', (message: string) => {
      try {
        const data = JSON.parse(message);
        switch (data.event) {
          case 'start':
            streamSid = data.start.streamSid;
            this.agent!.handleSession(transport, { callSid: streamSid });
            break;
          case 'media':
            transport.emit('audio', { payload: data.media.payload });
            break;
          case 'stop':
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
