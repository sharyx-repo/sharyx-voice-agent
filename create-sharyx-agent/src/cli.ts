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

    // Copy template
    const templatePath = path.join(templatesDir, 'basic'); // Fallback to basic for V1
    await fs.copy(templatePath, targetDir);

    // Update package.json
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
