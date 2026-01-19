import * as fs from 'fs/promises';
import * as path from 'path';
import inquirer from 'inquirer';
import { ConfigManager, LLMProvider, ModelProfile } from '../utils/config-manager';
import { Initializer } from '../librarian/initializer';
import { MemoryManager } from '../librarian/memory-manager';

/**
 * ASCII art logo for VibeGuard
 */
const VIBEGUARD_LOGO = `
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║   ██╗   ██╗██╗██████╗ ███████╗ ██████╗ ██╗   ██╗ █████╗   ║
║   ██║   ██║██║██╔══██╗██╔════╝██╔════╝ ██║   ██║██╔══██╗  ║
║   ██║   ██║██║██████╔╝█████╗  ██║  ███╗██║   ██║███████║  ║
║   ╚██╗ ██╔╝██║██╔══██╗██╔══╝  ██║   ██║██║   ██║██╔══██║  ║
║    ╚████╔╝ ██║██║  ██║███████╗╚██████╔╝╚██████╔╝██║  ██║  ║
║     ╚═══╝  ╚═╝╚═╝  ╚═╝╚══════╝ ╚═════╝  ╚═════╝ ╚═╝  ╚═╝  ║
║                                                           ║
║          Context Management for AI Coding Assistants      ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
`;

/**
 * Show branding/logo
 */
function showBranding(): void {
  console.log(VIBEGUARD_LOGO);
  console.log('Welcome to VibeGuard! Let\'s set up your project.\n');
}

/**
 * Step 1: Provider Setup
 */
async function stepProviderSetup(): Promise<LLMProvider> {
  const providers: Array<{ name: string; value: LLMProvider }> = [
    { name: 'Google (Gemini)', value: 'google' },
    { name: 'OpenAI (GPT-4)', value: 'openai' },
    { name: 'Anthropic (Claude)', value: 'anthropic' },
  ];

  const { provider } = await inquirer.prompt<{ provider: LLMProvider }>([
    {
      type: 'list',
      name: 'provider',
      message: 'Which LLM provider would you like to use?',
      choices: providers,
      default: 'google',
    },
  ]);

  // Check if API key exists
  let apiKey = await ConfigManager.getApiKey(provider);
  
  if (!apiKey) {
    // Prompt for API key
    const keyName = provider === 'google' ? 'GEMINI_API_KEY' : 
                    provider === 'openai' ? 'OPENAI_API_KEY' : 
                    'ANTHROPIC_API_KEY';
    
    const { apiKeyInput, saveToGlobal } = await inquirer.prompt<{
      apiKeyInput: string;
      saveToGlobal: boolean;
    }>([
      {
        type: 'password',
        name: 'apiKeyInput',
        message: `Enter your ${keyName}:`,
        validate: (input: string) => {
          if (!input || input.trim().length === 0) {
            return 'API key cannot be empty';
          }
          return true;
        },
      },
      {
        type: 'confirm',
        name: 'saveToGlobal',
        message: 'Save this API key to global config (~/.vibeguard/config.json)?',
        default: true,
      },
    ]);

    // Save to global config if requested
    if (saveToGlobal) {
      const globalConfig = await ConfigManager.loadGlobalConfig() || {};
      if (provider === 'google') {
        globalConfig.geminiApiKey = apiKeyInput;
      } else if (provider === 'openai') {
        globalConfig.openaiApiKey = apiKeyInput;
      } else if (provider === 'anthropic') {
        globalConfig.anthropicApiKey = apiKeyInput;
      }
      await ConfigManager.saveGlobalConfig(globalConfig);
      console.log('✅ API key saved to global config\n');
    } else {
      // Set as environment variable for this session
      if (provider === 'google') {
        process.env.GEMINI_API_KEY = apiKeyInput;
      } else if (provider === 'openai') {
        process.env.OPENAI_API_KEY = apiKeyInput;
      } else if (provider === 'anthropic') {
        process.env.ANTHROPIC_API_KEY = apiKeyInput;
      }
    }

    apiKey = apiKeyInput;
  } else {
    console.log(`✅ Using existing API key for ${provider}\n`);
  }

  return provider;
}

/**
 * Step 2: Model Profile Selection
 */
async function stepModelProfile(): Promise<ModelProfile> {
  const { profile } = await inquirer.prompt<{ profile: ModelProfile }>([
    {
      type: 'list',
      name: 'profile',
      message: 'Choose your "Vibe" (Model Profile):',
      choices: [
        {
          name: 'Economy - Uses Flash models for everything (Cheapest)',
          value: 'Economy',
        },
        {
          name: 'Balanced - Flash for Summaries, Pro for Oracle/Auto-Fix (Recommended)',
          value: 'Balanced',
        },
        {
          name: 'High-IQ - Uses Pro/Opus for everything (Most Accurate)',
          value: 'High-IQ',
        },
      ],
      default: 'Balanced',
    },
  ]);

  return profile;
}

/**
 * Step 3: Project Soul
 */
async function stepProjectSoul(): Promise<string> {
  const { projectSoul } = await inquirer.prompt<{ projectSoul: string }>([
    {
      type: 'input',
      name: 'projectSoul',
      message: 'Describe your project in 2 sentences (Project Soul):',
      validate: (input: string) => {
        if (!input || input.trim().length < 20) {
          return 'Please provide at least 20 characters describing your project';
        }
        return true;
      },
    },
  ]);

  return projectSoul.trim();
}

/**
 * Check if .vibeguard folder exists and offer update
 */
async function checkExistingConfig(): Promise<boolean> {
  const exists = await ConfigManager.localConfigExists();
  
  if (exists) {
    const { update } = await inquirer.prompt<{ update: boolean }>([
      {
        type: 'confirm',
        name: 'update',
        message: '.vibeguard folder already exists. Update settings?',
        default: true,
      },
    ]);
    
    return update;
  }
  
  return true;
}

/**
 * Main init command handler
 */
export async function handleInit(): Promise<void> {
  try {
    // Step 0: Show branding
    showBranding();

    // Check if config exists
    const shouldProceed = await checkExistingConfig();
    if (!shouldProceed) {
      console.log('Initialization cancelled.');
      return;
    }

    // Step 1: Provider Setup
    console.log('📡 Step 1: Provider Setup\n');
    const provider = await stepProviderSetup();

    // Step 2: Model Profile
    console.log('⚡ Step 2: Model Profile\n');
    const profile = await stepModelProfile();

    // Step 3: Project Soul
    console.log('💫 Step 3: Project Soul\n');
    const projectSoul = await stepProjectSoul();

    // Save local config
    const localConfig = {
      provider,
      profile,
    };
    await ConfigManager.saveLocalConfig(localConfig);
    console.log('\n✅ Configuration saved to .vibeguard/settings.json\n');

    // Step 4: Initialize PROJECT_MEMORY.md
    console.log('🚀 Step 4: Initializing PROJECT_MEMORY.md...\n');
    
    const repoPath = process.cwd();
    const initializer = new Initializer(repoPath);
    const memoryManager = new MemoryManager(repoPath);

    // Check if PROJECT_MEMORY.md exists
    let existingMemory = '';
    let memoryExists = false;
    try {
      existingMemory = await memoryManager.readMemory();
      memoryExists = existingMemory.length > 0;
    } catch {
      // File doesn't exist, that's fine
    }

    if (memoryExists && existingMemory.includes('## Project Soul')) {
      // Update Project Soul section using MemoryManager's appendToSection
      // First, we need to replace the existing Project Soul content
      const lines = existingMemory.split('\n');
      const updatedLines: string[] = [];
      let inProjectSoul = false;
      let projectSoulEnded = false;

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        if (line.trim() === '## Project Soul') {
          inProjectSoul = true;
          updatedLines.push(line);
          updatedLines.push(''); // Blank line after header
          updatedLines.push(projectSoul);
          continue;
        }

        if (inProjectSoul && !projectSoulEnded) {
          // Skip old content until we hit the next section
          if (line.trim().startsWith('## ')) {
            projectSoulEnded = true;
            updatedLines.push(''); // Blank line before next section
            updatedLines.push(line);
          }
          // Skip old content
          continue;
        }

        updatedLines.push(line);
      }

      await memoryManager.writeMemory(updatedLines.join('\n'));
      console.log('✅ Updated PROJECT_MEMORY.md with new Project Soul\n');
    } else {
      // Run full initialization
      await initializer.initialize();
      
      // If we have a Project Soul from the wizard, update it
      if (projectSoul) {
        try {
          const currentMemory = await memoryManager.readMemory();
          if (currentMemory.includes('## Project Soul')) {
            // Replace Project Soul section
            const lines = currentMemory.split('\n');
            const updatedLines: string[] = [];
            let inProjectSoul = false;
            let projectSoulEnded = false;

            for (let i = 0; i < lines.length; i++) {
              const line = lines[i];
              
              if (line.trim() === '## Project Soul') {
                inProjectSoul = true;
                updatedLines.push(line);
                updatedLines.push(''); // Blank line after header
                updatedLines.push(projectSoul);
                continue;
              }

              if (inProjectSoul && !projectSoulEnded) {
                if (line.trim().startsWith('## ')) {
                  projectSoulEnded = true;
                  updatedLines.push(''); // Blank line before next section
                  updatedLines.push(line);
                }
                continue;
              }

              updatedLines.push(line);
            }

            await memoryManager.writeMemory(updatedLines.join('\n'));
          }
        } catch (error) {
          // If update fails, that's okay - the initializer already created the file
          console.warn('Note: Could not update Project Soul, but initialization completed successfully.');
        }
      }
      
      console.log('✅ PROJECT_MEMORY.md initialized\n');
    }

    console.log('🎉 Initialization complete!');
    console.log('\nNext steps:');
    console.log('  • Run `vibeguard watch` to start monitoring your repository');
    console.log('  • Run `vibeguard dashboard` to view the visual dashboard');
    console.log('  • Run `vibeguard check` to verify your setup\n');
  } catch (error: any) {
    console.error('\n❌ Initialization failed:', error.message || error);
    process.exit(1);
  }
}

