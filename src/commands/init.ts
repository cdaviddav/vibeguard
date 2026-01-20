import * as fs from 'fs/promises';
import * as path from 'path';
import inquirer from 'inquirer';
import { ConfigManager, LLMProvider, ModelProfile } from '../utils/config-manager';
import { Initializer } from '../librarian/initializer';
import { MemoryManager } from '../librarian/memory-manager';

/**
 * Show branding with ASCII logo
 */
function showBranding(): void {
  const logo = `
╔═══════════════════════════════════════╗
║                                       ║
║    ██╗   ██╗██╗██████╗ ███████╗      ║
║    ██║   ██║██║██╔══██╗██╔════╝      ║
║    ██║   ██║██║██████╔╝█████╗        ║
║    ╚██╗ ██╔╝██║██╔══██╗██╔══╝        ║
║     ╚████╔╝ ██║██████╔╝███████╗      ║
║      ╚═══╝  ╚═╝╚═════╝ ╚══════╝      ║
║                                       ║
║    ╔═══════════════════════════════╗  ║
║    ║   Project Intelligence Engine  ║  ║
║    ╚═══════════════════════════════╝  ║
║                                       ║
╚═══════════════════════════════════════╝
`;
  console.log(logo);
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
      try {
        const globalConfig = await ConfigManager.loadGlobalConfig() || {};
        if (provider === 'google') {
          globalConfig.geminiApiKey = apiKeyInput;
        } else if (provider === 'openai') {
          globalConfig.openaiApiKey = apiKeyInput;
        } else if (provider === 'anthropic') {
          globalConfig.anthropicApiKey = apiKeyInput;
        }
        
        const configPath = ConfigManager.getGlobalConfigPath();
        await ConfigManager.saveGlobalConfig(globalConfig);
        
        // Verify the file was actually created
        let verified = false;
        try {
          const verifyConfig = await ConfigManager.loadGlobalConfig();
          if (verifyConfig && 
              ((provider === 'google' && verifyConfig.geminiApiKey) ||
               (provider === 'openai' && verifyConfig.openaiApiKey) ||
               (provider === 'anthropic' && verifyConfig.anthropicApiKey))) {
            verified = true;
          }
        } catch (verifyError) {
          // Verification failed, but file write might still have succeeded
        }
        
        if (verified) {
          console.log(`✅ API key saved successfully to global config`);
          console.log(`   Location: ${configPath}\n`);
        } else {
          console.error(`⚠️  Warning: Config file may not have been saved correctly.`);
          console.error(`   Expected location: ${configPath}`);
          console.error(`   Please check if the file exists and contains your API key.\n`);
        }
      } catch (error: any) {
        console.error(`❌ Failed to save API key to global config: ${error.message || error}`);
        console.error(`Config path: ${ConfigManager.getGlobalConfigPath()}`);
        throw error;
      }
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
 * Generate governance.mdc cursor rule
 */
async function generateGovernanceRule(repoPath: string): Promise<void> {
  const rulesDir = path.join(repoPath, '.cursor', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });
  
  const governanceContent = `# VibeGuard Governance Rules

**Always Apply** | **Globs:** \`src/**/*\`

## Core Protocol

Before any task:
1. Call \`get_core_context\` to refresh project memory and architecture understanding.
2. Read \`DIAGRAM.md\` to map component dependencies and relationships.
3. Respect the "Pinned Files" logic from PROJECT_MEMORY.md; do not propose changes that contradict pinned file requirements without explicitly mentioning the conflict.

During task execution:
- Follow the architectural patterns established in DIAGRAM.md.
- Maintain consistency with existing code structure and conventions.

After completing a task:
1. Use \`update_project_memory\` to record the change.
2. Group related changes into a single "Atomic Update" entry in Recent Decisions.
3. If modifying architecture, consider whether DIAGRAM.md needs regeneration (run \`vibeguard visualize\`).

## Memory Management

- **Atomic Updates**: Group logically related changes into single entries (e.g., "Added X feature with Y and Z components").
- **Pruning Logic**: If Recent Decisions exceeds 15 entries, summarize the oldest 5 into a single "Legacy Decisions" bullet point before adding new ones.
- **Section Appending**: Use \`update_project_memory\` with the appropriate section name to maintain organized memory structure.

## Conflict Resolution

If proposed changes contradict:
- Pinned Files logic → Mention the conflict explicitly and explain why the change is necessary.
- Existing architecture in DIAGRAM.md → Consider updating the diagram if the change is intentional.
- Recent Decisions → Reference the conflicting decision and explain the evolution.

## Safety

Do not propose changes that would:
- Break existing functionality without explicit user approval.
- Violate the project's architectural boundaries without discussion.
- Overwrite or ignore Pinned Files without acknowledgment.
`;

  await fs.writeFile(
    path.join(rulesDir, 'governance.mdc'),
    governanceContent,
    'utf-8'
  );
}

/**
 * Generate visualizer.mdc cursor rule
 */
async function generateVisualizerRule(repoPath: string): Promise<void> {
  const rulesDir = path.join(repoPath, '.cursor', 'rules');
  await fs.mkdir(rulesDir, { recursive: true });
  
  const visualizerContent = `# VibeGuard Visual Soul Styling Rules

**Apply Intelligently** | **Globs:** \`DIAGRAM.md\`

## Staleness Check Protocol

Before calling \`get_core_context\` or reading DIAGRAM.md:
1. Check if files in \`src/\` directory are newer than \`DIAGRAM.md\`.
2. If stale (src/ is newer), automatically run \`vibeguard visualize\` to regenerate the diagram.
3. Wait for diagram regeneration to complete before proceeding with context retrieval.

This ensures architecture diagrams are always up-to-date with the codebase.

## Mermaid Diagram Styling

When generating or updating DIAGRAM.md, apply the following styling rules:

### Color Scheme
- **Internal Logic**: Light Green (#e8f5e9) - Use for internal components, services, and business logic.
- **External Services**: Light Blue (#e1f5fe) - Use for APIs, external integrations, and third-party services.
- **Persistence/Storage**: Soft Amber (#fff8e1) - Use for databases, file systems, and data storage.

### Layout Rules
- **Overall Direction**: Use \`direction TB\` (Top-Bottom) for the main diagram flow.
- **Subgraphs**: Use \`direction LR\` (Left-Right) for subgraph layouts to improve readability.
- **Class Definitions**: Apply classDef for consistent styling across similar node types.

### Syntax Validation

Before writing DIAGRAM.md:
1. Ensure all Mermaid syntax is valid (balanced brackets, closed subgraphs).
2. Test that the diagram renders correctly.
3. If syntax errors are detected, fix immediately before saving.

### Example Structure

\`\`\`mermaid
flowchart TB
    classDef internal fill:#e8f5e9,stroke:#4caf50,stroke-width:2px
    classDef external fill:#e1f5fe,stroke:#0288d1,stroke-width:2px
    classDef storage fill:#fff8e1,stroke:#f57c00,stroke-width:2px
    
    subgraph ExternalServices [External Services]
        API[External API]
    end
    
    subgraph InternalLogic [Internal Logic]
        Service[Core Service]
    end
    
    subgraph Persistence [Storage]
        DB[(Database)]
    end
    
    class API external
    class Service internal
    class DB storage
\`\`\`
`;

  await fs.writeFile(
    path.join(rulesDir, 'visualizer.mdc'),
    visualizerContent,
    'utf-8'
  );
}

/**
 * Handle legacy .cursorrules migration
 */
async function migrateLegacyCursorRules(repoPath: string): Promise<void> {
  const legacyRulesPath = path.join(repoPath, '.cursorrules');
  
  try {
    await fs.access(legacyRulesPath);
    // Legacy file exists, rename it
    const backupPath = path.join(repoPath, '.cursorrules.bak');
    await fs.rename(legacyRulesPath, backupPath);
    console.log('✅ Migrated legacy .cursorrules to .cursorrules.bak');
    console.log('   VibeGuard now uses .cursor/rules/*.mdc format for better organization.\n');
  } catch {
    // File doesn't exist, nothing to migrate
  }
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

    // Step 3.5: Generate Cursor Rules
    console.log('⚙️  Step 3.5: Generating Cursor Rules...\n');
    const repoPath = process.cwd();
    
    // Migrate legacy .cursorrules if exists
    await migrateLegacyCursorRules(repoPath);
    
    // Generate governance and visualizer rules
    await generateGovernanceRule(repoPath);
    await generateVisualizerRule(repoPath);
    console.log('✅ Cursor rules generated in .cursor/rules/\n');

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

