#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const prompts_1 = __importDefault(require("prompts"));
const kleur_1 = __importDefault(require("kleur"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
const templatesDir = path_1.default.join(__dirname, '../templates');
async function main() {
    console.log(kleur_1.default.cyan().bold('\n🎙️  Sharyx: Create Voice Agent\n'));
    const response = await (0, prompts_1.default)([
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
    if (!response.name)
        return;
    const targetDir = path_1.default.join(process.cwd(), response.name);
    if (fs_extra_1.default.existsSync(targetDir)) {
        console.log(kleur_1.default.red(`Error: Directory ${response.name} already exists.`));
        return;
    }
    console.log(kleur_1.default.gray(`\nCreating ${response.name} using ${response.template} template...`));
    // Copy template
    const templatePath = path_1.default.join(templatesDir, 'basic'); // Fallback to basic for V1
    await fs_extra_1.default.copy(templatePath, targetDir);
    // Update package.json
    const pkgPath = path_1.default.join(targetDir, 'package.json');
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
    await fs_extra_1.default.writeJson(pkgPath, pkg, { spaces: 2 });
    console.log(kleur_1.default.green('\n✅ Project created successfully!\n'));
    console.log('Next steps:');
    console.log(kleur_1.default.yellow(`  cd ${response.name}`));
    console.log(kleur_1.default.yellow('  npm install'));
    console.log(kleur_1.default.yellow('  echo "OPENAI_API_KEY=sk-..." > .env'));
    console.log(kleur_1.default.yellow('  npm start\n'));
}
main().catch(console.error);
