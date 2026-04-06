import 'dotenv/config';
import { createAgent } from 'sharyx-voice-agent';

/**
 * 🛠️ Customer Support Bot
 * Handles user inquiries and can create tickets via tool calling.
 */
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: `You are a friendly customer support agent for TechCorp.
Always be empathetic and solution-oriented. Ask one question at a time.
If you cannot resolve the issue, offer to create a support ticket.`,
  firstMessage: 'Hi there! Thanks for calling TechCorp support. How can I help you today?',
  tools: [
    {
      name: 'create_ticket',
      description: 'Create a support ticket for the customer',
      parameters: {
        subject: { type: 'string', description: 'Issue summary' },
        priority: { type: 'string', description: 'low, medium, or high' },
      },
      handler: async (args: any) => {
        console.log('📝 Ticket created:', args);
        return { ticketId: 'TKT-' + Date.now(), status: 'created' };
      },
    },
  ],
});

// Run the interactive chat in the terminal
agent.chat();
