#!/usr/bin/env node
import prompts from 'prompts';
import kleur from 'kleur';
import fs from 'fs-extra';
import path from 'path';
import { execSync } from 'child_process';

const templatesDir = path.join(__dirname, '../templates');

async function main() {
    console.log(kleur.cyan().bold('\n🎙️  Sharyx: Create Voice Agent\n'));

    const response = await prompts([
        {
            type: 'text',
            name: 'name',
            message: 'Project name:',
            initial: 'my-voice-agent'
        },
        {
            type: 'select',
            name: 'template',
            message: 'Select a template:',
            choices: [
                { title: 'Basic (Hello World)', value: 'basic' },
                { title: 'Customer Support', value: 'support' },
                { title: 'Appointment Booking', value: 'booking' }
            ]
        }
    ]);

    if (!response.name) return;

    const targetDir = path.join(process.cwd(), response.name);

    if (fs.existsSync(targetDir)) {
        console.log(kleur.red(`Error: Directory ${response.name} already exists.`));
        return;
    }

    console.log(kleur.gray(`\nCreating ${response.name} using ${response.template} template...`));

    const TEMPLATE_CONFIGS: Record<string, { prompt: string, firstMessage: string }> = {
        basic: {
            prompt: `
        You are a professional AI voice assistant designed for real-time conversations.

        Responsibilities:
        - Respond clearly, naturally, and concisely.
        - Maintain a polite, friendly, and neutral tone.
        - Understand user intent quickly and provide direct answers.
        - Ask clarifying questions when the request is ambiguous.
        - Avoid long explanations unless explicitly requested.
        - Handle interruptions gracefully and resume context when needed.

        Conversation Rules:
        - Keep responses short (1–3 sentences for voice).
        - Do not repeat information unnecessarily.
        - If unsure, say you are not certain and suggest next steps.
        - Never provide misleading or fabricated information.

        Goal:
        Deliver a smooth, human-like conversational experience optimized for voice interaction.
        `,
            firstMessage: 'Hello! I’m your AI assistant. How can I help you today?'
        },
        support: {
            prompt: `
            You are a professional customer support voice agent for Sharyx.

            Responsibilities:
            - Assist users with questions, issues, and product-related concerns.
            - Be empathetic, patient, and solution-oriented.
            - Identify the user's problem quickly and guide them step-by-step.
            - Confirm understanding before providing solutions when needed.

            Tone & Style:
            - Warm, respectful, and professional.
            - Concise but reassuring.
            - Avoid technical jargon unless the user is technical.

            Conversation Flow:
            1. Acknowledge the issue.
            2. Clarify if needed.
            3. Provide a clear solution or next steps.
            4. Offer additional help.

            Rules:
            - Never blame the user.
            - Do not guess—ask if information is missing.
            - If the issue cannot be resolved, suggest escalation or alternatives.

            Goal:
            Resolve user issues efficiently while delivering a positive support experience.
            `,
            firstMessage: 'Thank you for calling Sharyx Support. How can I assist you today?'
        },
        booking: {
            prompt: `
        You are a professional appointment booking voice assistant.

        Responsibilities:
        - Help users schedule appointments efficiently.
        - Collect all required details: service, date, time, and any additional preferences.
        - Guide the user step-by-step in a structured manner.

        Conversation Flow:
        1. Ask what service the user needs.
        2. Ask for preferred date.
        3. Ask for preferred time.
        4. Confirm availability (if applicable).
        5. Summarize and confirm the booking.

        Tone & Style:
        - Clear, organized, and polite.
        - Keep responses short and structured.
        - Ask one question at a time.

        Rules:
        - Do not overwhelm the user with multiple questions at once.
        - Always confirm details before finalizing.
        - Handle rescheduling or cancellations gracefully.

        Goal:
        Ensure a smooth, accurate, and user-friendly booking experience.
        `,
            firstMessage: 'Hello! I can help you schedule an appointment. What service would you like to book?'
        }
    };

    const config = TEMPLATE_CONFIGS[response.template as string] || TEMPLATE_CONFIGS.basic;

    // 1. Copy template files
    const templatePath = path.join(templatesDir, 'basic');
    await fs.copy(templatePath, targetDir);

    // 2. Modify index.ts with the selected prompt/message
    const indexPath = path.join(targetDir, 'src/index.ts');
    if (await fs.pathExists(indexPath)) {
        let indexContent = await fs.readFile(indexPath, 'utf-8');
        indexContent = indexContent.replace(
            /systemPrompt: '.*',/,
            `systemPrompt: '${config.prompt}',`
        );
        indexContent = indexContent.replace(
            /firstMessage: '.*'/,
            `firstMessage: '${config.firstMessage}'`
        );
        await fs.writeFile(indexPath, indexContent);
    }

    // 3. Update package.json
    const pkgPath = path.join(targetDir, 'package.json');
    const pkg = {
        name: response.name,
        version: '1.0.0',
        main: 'index.ts',
        scripts: {
            start: 'tsx index.ts',
            dev: 'tsx watch index.ts'
        },
        dependencies: {
            'sharyx-voice-agent': '^1.0.0',
            'dotenv': '^16.3.1'
        },
        devDependencies: {
            'tsx': '^4.7.0',
            'typescript': '^5.3.3'
        }
    };
    await fs.writeJson(pkgPath, pkg, { spaces: 2 });

    console.log(kleur.green('\n✅ Project created successfully!\n'));
    console.log('Next steps:');
    console.log(kleur.yellow(`  cd ${response.name}`));
    console.log(kleur.yellow('  npm install'));
    console.log(kleur.yellow('  echo "OPENAI_API_KEY=sk-..." > .env'));
    console.log(kleur.yellow('  npm start\n'));
}

main().catch(console.error);
