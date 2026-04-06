import 'dotenv/config';
import { createAgent } from 'sharyx-voice-agent';

/**
 * 📅 Appointment Booking Bot
 * Handles user booking requests and checks current availability.
 */
const agent = createAgent({
  apiKey: process.env.OPENAI_API_KEY,
  systemPrompt: `You are a booking assistant for City Medical Center.
Available slots: Mon-Fri, 9 AM - 5 PM.
Collect: patient name, preferred date/time, reason for visit.
Confirm the booking before ending the call.`,
  firstMessage: 'Hello! This is City Medical Center. How can I assist you?',
  tools: [
    {
      name: 'check_availability',
      description: 'Check available appointment slots',
      parameters: {
        date: { type: 'string', description: 'Date to check (YYYY-MM-DD)' },
      },
      handler: async (args: any) => {
        return { date: args.date, slots: ['9:00 AM', '10:30 AM', '2:00 PM', '4:00 PM'] };
      },
    },
    {
      name: 'book_appointment',
      description: 'Book an appointment for the customer',
      parameters: {
        name: { type: 'string' },
        date: { type: 'string' },
        time: { type: 'string' },
        reason: { type: 'string' },
      },
      handler: async (args: any) => {
        return { confirmed: true, appointmentId: 'APT-' + Date.now() };
      },
    },
  ],
});

// Run the interactive chat in the terminal
agent.chat();
