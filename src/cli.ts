#!/usr/bin/env node

import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { Initializer } from './librarian/initializer.js';
import { Watcher } from './librarian/watcher.js';
import { Summarizer } from './librarian/summarizer.js';
import { MemoryManager } from './librarian/memory-manager.js';
import { OracleService } from './librarian/oracle.js';
import { Heartbeat } from './librarian/heartbeat.js';
import { GitUtils } from './utils/git.js';
import { getApiKey, getModel } from './utils/config.js';
import { generateSummary } from './utils/llm.js';
import { handleDashboard } from './commands/dashboard.js';
import { handleInit } from './commands/init.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import { simpleGit } from 'simple-git';

// Robust ESM path logic
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
// This resolves to the dashboard/dist folder at the package root
// when the CLI is running from the dist/ folder.
export const DASHBOARD_PATH = join(__dirname, '../dashboard/dist');

// Helper to resolve paths relative to the package root
// This works whether installed via npm or run via npx
export async function resolvePackagePath(...segments: string[]): Promise<string> {
  // When installed, node_modules/@vibeguard/cli/dist/cli.js
  // When run via npx, the package is in a temp directory
  // We need to find the package root (where templates/ would be)
  
  // Try to find the package root by looking for package.json
  let currentDir = __dirname;
  const maxDepth = 10;
  let depth = 0;
  
  while (depth < maxDepth) {
    try {
      const packageJsonPath = join(currentDir, 'package.json');
      await fs.access(packageJsonPath);
      // Found package.json, this is likely the package root
      return join(currentDir, ...segments);
    } catch {
      // Not found, go up one level
      const parent = path.dirname(currentDir);
      if (parent === currentDir) {
        // Reached filesystem root
        break;
      }
      currentDir = parent;
      depth++;
    }
  }
  
  // Fallback: use __dirname (dist/) and go up to package root
  // dist/ -> package root
  return join(path.dirname(__dirname), ...segments);
}

const COMMANDS = {
  INIT: 'init',
  WATCH: 'watch',
  SYNC: 'sync',
  CHECK: 'check',
  VISUALIZE: 'visualize',
  DASHBOARD: 'dashboard',
} as const;

async function setupServices() {
  // Validate API key is available (backward compatibility)
  // New init command handles this via ConfigManager
  try {
    await getApiKey();
  } catch (error: any) {
    // Don't exit if using new config system - let init command handle it
    console.warn('Warning: API key not found. Run `vibeguard init` to configure.');
  }
}

async function handleWatch() {
  console.log('Starting VibeGuard Librarian watcher...\n');
  
  await setupServices();
  
  const repoPath = process.cwd();
  const watcher = new Watcher(repoPath);
  const summarizer = new Summarizer();
  const memoryManager = new MemoryManager(repoPath);
  const gitUtils = new GitUtils(repoPath);
  
  // Initialize Oracle and Heartbeat
  const oracle = new OracleService(repoPath);
  const heartbeat = new Heartbeat(oracle);
  heartbeat.start(); // Start quiet reflection monitoring

  // Set up commit processing callback
  watcher.onCommitDetected(async () => {
    // Record activity for quiet reflection
    heartbeat.recordActivity();
    try {
      console.log('New commit detected, processing...');
      
      const lastProcessed = await watcher.getLastProcessedCommit();
      const currentHead = await gitUtils.getHeadCommit();
      
      if (lastProcessed === currentHead) {
        // No new commit, check for unstaged changes as draft memory
        const unstagedDiff = await gitUtils.getUnstagedDiff();
        if (unstagedDiff && unstagedDiff.trim().length > 0) {
          console.log('No new commit, but unstaged changes detected. Creating draft memory...');
          
          // Read current memory
          const currentMemory = await memoryManager.readMemory();
          
          // Prefix with draft note
          const draftDiff = `## Draft Changes (Unstaged)\n\n${unstagedDiff}`;
          
          // Summarize and update (using flash for routine summarization)
          const updatedMemory = await summarizer.summarizeDiff(draftDiff, currentMemory, 'flash');
          
          // Write updated memory
          await memoryManager.writeMemory(updatedMemory);
          
          console.log('✅ Draft memory updated successfully');
        }
        return; // Already processed or no changes
      }

      // Get diff for ALL commits between lastProcessed and currentHead
      // This handles cases where multiple commits happened quickly
      let diff: string;
      if (lastProcessed) {
        // Get diff from lastProcessed to currentHead (covers all commits in between)
        try {
          diff = await gitUtils.getCommitRangeDiff(lastProcessed, currentHead);
        } catch (error: any) {
          // Fallback: if range diff fails, try latest commit only
          console.warn('Could not get commit range diff, falling back to latest commit:', error.message);
          diff = await gitUtils.getLatestCommitDiff();
        }
      } else {
        // No previous commit, use latest commit diff
        diff = await gitUtils.getLatestCommitDiff();
      }
      
      if (!diff || diff.trim().length === 0) {
        console.log('No diff found. Skipping...');
        await watcher.setLastProcessedCommit(currentHead);
        return;
      }
      
      // Read current memory
      const currentMemory = await memoryManager.readMemory();
      
      // Summarize and update (using flash for routine summarization)
      const updatedMemory = await summarizer.summarizeDiff(diff, currentMemory, 'flash');
      
      // Write updated memory
      await memoryManager.writeMemory(updatedMemory);
      
      // Update last processed commit
      await watcher.setLastProcessedCommit(currentHead);
      
      console.log('✅ Memory updated successfully');
    } catch (error) {
      console.error('Error processing commit:', error);
    }
  });

  // Initialize watcher state with current HEAD if not set
  const currentHead = await gitUtils.getHeadCommit();
  const lastProcessed = await watcher.getLastProcessedCommit();
  if (!lastProcessed) {
    await watcher.setLastProcessedCommit(currentHead);
  }

  // Start watching
  await watcher.startWatching();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down watcher...');
    heartbeat.stop();
    await watcher.stopWatching();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down watcher...');
    heartbeat.stop();
    await watcher.stopWatching();
    process.exit(0);
  });

  // Keep process alive
  console.log('Watcher is running. Press Ctrl+C to stop.\n');
}

async function handleCheck() {
  console.log('VibeGuard Health Check\n');
  
  const checks: Array<{ name: string; status: boolean; message: string }> = [];
  
  // Check 1: .env file exists and contains API key
  try {
    const envPath = path.join(process.cwd(), '.env');
    try {
      const envContent = await fs.readFile(envPath, 'utf-8');
      // Check for GEMINI_API_KEY with more robust parsing
      const lines = envContent.split('\n');
      const apiKeyLine = lines.find(line => 
        line.trim().startsWith('GEMINI_API_KEY=') && 
        !line.trim().startsWith('#')
      );
      
      if (apiKeyLine) {
        // Extract value (handle quoted and unquoted values)
        const value = apiKeyLine.split('=')[1]?.trim().replace(/^["']|["']$/g, '');
        if (value && value.length > 0) {
          checks.push({ name: 'Environment (.env)', status: true, message: '.env file exists with GEMINI_API_KEY' });
        } else {
          checks.push({ name: 'Environment (.env)', status: false, message: '.env file exists but GEMINI_API_KEY is empty' });
        }
      } else {
        checks.push({ name: 'Environment (.env)', status: false, message: '.env file exists but GEMINI_API_KEY is missing' });
      }
    } catch (error) {
      checks.push({ name: 'Environment (.env)', status: false, message: '.env file not found in project root' });
    }
  } catch (error) {
    checks.push({ name: 'Environment (.env)', status: false, message: 'Error checking .env file' });
  }
  
  // Check 2: API key is valid and active (test with minimal Gemini call)
  try {
    const apiKey = await getApiKey();
    // Basic validation: API key should be non-empty and look valid
    if (!apiKey || apiKey.trim().length === 0) {
      checks.push({ name: 'Librarian Health (API Key)', status: false, message: 'API key is empty' });
    } else {
      // Test with minimal call - use a neutral prompt unlikely to trigger safety filters
      try {
        const model = await getModel();
        await generateSummary('Say hello', 'You are a helpful assistant. Respond briefly.', { maxTokens: 1000, feature: 'Librarian' });
        checks.push({ name: 'Librarian Health (API Key)', status: true, message: `API key is active (tested with ${model})` });
      } catch (error: any) {
        const errorMsg = error.message || 'Unknown error';
        if (errorMsg.includes('API_KEY') || errorMsg.includes('401') || errorMsg.includes('403')) {
          checks.push({ name: 'Librarian Health (API Key)', status: false, message: `API key is invalid or unauthorized: ${errorMsg}` });
        } else {
          checks.push({ name: 'Librarian Health (API Key)', status: false, message: `API test failed: ${errorMsg}` });
        }
      }
    }
  } catch (error: any) {
    checks.push({ name: 'Librarian Health (API Key)', status: false, message: `API key not found: ${error.message || 'Unknown error'}` });
  }
  
  // Check 3: Git repository
  try {
    const git = simpleGit(process.cwd());
    const isRepo = await git.checkIsRepo();
    if (isRepo) {
      checks.push({ name: 'Git Status', status: true, message: 'Current directory is a Git repository' });
    } else {
      checks.push({ name: 'Git Status', status: false, message: 'Current directory is not a Git repository' });
    }
  } catch (error) {
    checks.push({ name: 'Git Status', status: false, message: 'Error checking Git repository status' });
  }
  
  // Check 4: PROJECT_MEMORY.md exists
  try {
    const memoryPath = path.join(process.cwd(), 'PROJECT_MEMORY.md');
    try {
      await fs.access(memoryPath);
      checks.push({ name: 'PROJECT_MEMORY.md', status: true, message: 'PROJECT_MEMORY.md exists' });
    } catch (error) {
      checks.push({ name: 'PROJECT_MEMORY.md', status: false, message: 'PROJECT_MEMORY.md not found in project root' });
    }
  } catch (error) {
    checks.push({ name: 'PROJECT_MEMORY.md', status: false, message: 'Error checking PROJECT_MEMORY.md' });
  }
  
  // Print status report
  console.log('Status Report:');
  console.log('─'.repeat(60));
  
  for (const check of checks) {
    const icon = check.status ? '✓' : '✗';
    const colorCode = check.status ? '\x1b[32m' : '\x1b[31m'; // Green for success, red for failure
    const resetCode = '\x1b[0m';
    
    console.log(`${colorCode}${icon}${resetCode} ${check.name.padEnd(30)} ${check.message}`);
  }
  
  console.log('─'.repeat(60));
  
  const allPassed = checks.every(c => c.status);
  if (allPassed) {
    console.log('\n✅ All checks passed! VibeGuard is ready to use.');
  } else {
    console.log('\n⚠️  Some checks failed. Please review the issues above.');
    process.exit(1);
  }
}

/**
 * Scan src/ directory and return file structure
 */
async function scanSrcDirectory(): Promise<string> {
  const srcPath = path.join(process.cwd(), 'src');
  const files: string[] = [];
  
  async function walkDir(dir: string, prefix: string = '', depth: number = 0): Promise<void> {
    if (depth > 10) return; // Limit depth
    
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      
      // Filter out common ignore patterns
      const filtered = entries.filter(entry => {
        const name = entry.name;
        return !name.startsWith('.') && 
               name !== 'node_modules' && 
               name !== 'dist' && 
               name !== 'build';
      });

      for (let i = 0; i < filtered.length; i++) {
        const entry = filtered[i];
        const isLast = i === filtered.length - 1;
        const currentPrefix = isLast ? '└── ' : '├── ';
        const nextPrefix = isLast ? '    ' : '│   ';
        
        files.push(prefix + currentPrefix + entry.name);
        
        if (entry.isDirectory()) {
          const fullPath = path.join(dir, entry.name);
          await walkDir(fullPath, prefix + nextPrefix, depth + 1);
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  try {
    await fs.access(srcPath);
    await walkDir(srcPath);
  } catch (error) {
    throw new Error('src/ directory not found. Make sure you are in the project root.');
  }
  
  return files.join('\n');
}

/**
 * Validate Mermaid syntax - check for unclosed brackets
 */
function validateMermaidSyntax(mermaidCode: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Extract the mermaid code block content
  const mermaidMatch = mermaidCode.match(/```mermaid\n([\s\S]*?)```/);
  if (!mermaidMatch) {
    errors.push('No mermaid code block found');
    return { valid: false, errors };
  }
  
  const code = mermaidMatch[1];
  
  // Check for balanced brackets
  const bracketPairs: Array<{ open: string; close: string; name: string }> = [
    { open: '[', close: ']', name: 'square brackets' },
    { open: '(', close: ')', name: 'parentheses' },
    { open: '{', close: '}', name: 'curly braces' },
  ];
  
  for (const pair of bracketPairs) {
    let depth = 0;
    for (let i = 0; i < code.length; i++) {
      if (code[i] === pair.open) {
        depth++;
      } else if (code[i] === pair.close) {
        depth--;
        if (depth < 0) {
          errors.push(`Unmatched closing ${pair.name} at position ${i}`);
          return { valid: false, errors };
        }
      }
    }
    if (depth > 0) {
      errors.push(`Unclosed ${pair.name}: ${depth} unclosed bracket(s)`);
    }
  }
  
  // Check for balanced subgraph blocks
  const subgraphOpen = (code.match(/subgraph\s+[^\s]+\s*\[/g) || []).length;
  const subgraphClose = (code.match(/end\s*$/gm) || []).length;
  if (subgraphOpen !== subgraphClose) {
    errors.push(`Unbalanced subgraphs: ${subgraphOpen} opened, ${subgraphClose} closed`);
  }
  
  return { valid: errors.length === 0, errors };
}

async function handleVisualize() {
  console.log('Generating architecture diagram...\n');
  
  await setupServices();
  
  const repoPath = process.cwd();
  const srcPath = path.join(repoPath, 'src');
  
  try {
    // Check if src/ exists
    await fs.access(srcPath);
  } catch (error) {
    console.error('Error: src/ directory not found. Make sure you are in the project root.');
    process.exit(1);
  }
  
  // Scan src/ directory
  console.log('Scanning src/ directory...');
  const fileStructure = await scanSrcDirectory();
  
  // Read PROJECT_MEMORY.md for context
  const memoryManager = new MemoryManager(repoPath);
  let projectMemory = '';
  try {
    projectMemory = await memoryManager.readMemory();
  } catch (error) {
    console.warn('Warning: Could not read PROJECT_MEMORY.md. Continuing without context...');
  }
  
  // Build prompt for Gemini
  const today = new Date().toLocaleDateString();
  const prompt = `You are a Senior Software Architect & Mermaid.js Specialist. Your task is to generate a valid Mermaid.js flowchart (TD - Top Down) that visually represents the project's architecture.

# PROJECT STRUCTURE
\`\`\`
${fileStructure}
\`\`\`

${projectMemory ? `# PROJECT CONTEXT\n\`\`\`\n${projectMemory}\n\`\`\`\n\n` : ''}# REQUIREMENTS
1. Use Mermaid.js Flowchart syntax (flowchart TD)
2. Structure:
   - Use subgraphs to group "Internal Logic" vs "External Services"
   - Nodes should represent key components (CLI, MCP Server, Watcher, Gemini API, File System, etc.)
   - Edges should have descriptive text (e.g., "Sends Diffs", "Returns Summary", "Updates Memory")
3. Color Styling (REQUIRED):
   - Add a classDef section at the end of the Mermaid code (before the closing code block)
   - Define three classes with the following colors:
     * ExternalServices: fill:#e1f5fe (Light Blue)
     * InternalLogic: fill:#e8f5e9 (Light Green)
     * PersistenceFiles: fill:#fff8e1 (Soft Amber)
   - Apply classes to subgraphs or specific nodes:
     * Apply "ExternalServices" class to the "External Services" subgraph
     * Apply "InternalLogic" class to the "Internal Logic" subgraph
     * Apply "PersistenceFiles" class to nodes representing File System, Git Repository, or any persistence layer
   - Example classDef syntax:
     \`\`\`
     classDef ExternalServices fill:#e1f5fe,stroke:#01579b,stroke-width:2px
     classDef InternalLogic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
     classDef PersistenceFiles fill:#fff8e1,stroke:#f57f17,stroke-width:2px
     \`\`\`
   - Apply classes using: \`class subgraphId ExternalServices\` or \`class nodeId PersistenceFiles\`
4. Syntax Rules:
   - All node IDs must be alphanumeric (use [ ] for labels with spaces)
   - Avoid special characters like & or > inside labels unless escaped
   - Ensure all brackets are properly closed
   - All subgraphs must have matching "end" statements
5. Output Format:
   - Wrap the output in a standard Markdown code block: \`\`\`mermaid
   - Include a brief H1 header "# VibeGuard Architecture Diagram" before the code block
   - Add a short "Legend" section after the diagram explaining symbols and color scheme

# OUTPUT
Return ONLY the complete Markdown content for DIAGRAM.md, including:
- H1 header
- Mermaid code block with valid syntax
- Legend section

Do not include any explanations outside the Markdown format.`;

  const systemPrompt = `You are an expert at creating Mermaid.js diagrams for software architecture. You always generate valid, well-structured diagrams that follow Mermaid syntax rules strictly.`;

  console.log('Generating diagram with Gemini...');
  
  try {
    const diagramContent = await generateSummary(prompt, systemPrompt, {
      thinkingLevel: 'pro',
      maxTokens: 10000,
      feature: 'Librarian',
    });
    
    // Validate Mermaid syntax
    console.log('Validating Mermaid syntax...');
    const validation = validateMermaidSyntax(diagramContent);
    
    if (!validation.valid) {
      console.error('❌ Mermaid syntax validation failed:');
      validation.errors.forEach(error => console.error(`  - ${error}`));
      console.error('\nAttempting to fix syntax issues...');
      
      // Try to fix common issues and regenerate
      const fixPrompt = `The previous Mermaid diagram had syntax errors: ${validation.errors.join(', ')}. 

Please regenerate the diagram with these fixes:
${diagramContent}

CRITICAL REQUIREMENTS:
1. Ensure all brackets are closed and all subgraphs have matching "end" statements.
2. MUST include color styling with classDef:
   - classDef ExternalServices fill:#e1f5fe,stroke:#01579b,stroke-width:2px
   - classDef InternalLogic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
   - classDef PersistenceFiles fill:#fff8e1,stroke:#f57f17,stroke-width:2px
3. Apply classes to subgraphs: "External Services" subgraph gets ExternalServices class, "Internal Logic" subgraph gets InternalLogic class.
4. Apply PersistenceFiles class to File System, Git Repository, or any persistence-related nodes.`;
      
      const fixedContent = await generateSummary(fixPrompt, systemPrompt, {
        thinkingLevel: 'pro',
        maxTokens: 10000,
        feature: 'Librarian',
      });
      
      const fixedValidation = validateMermaidSyntax(fixedContent);
      if (!fixedValidation.valid) {
        console.error('❌ Could not fix syntax errors. Saving anyway, but diagram may not render correctly.');
        console.error('Errors:', fixedValidation.errors);
      } else {
        console.log('✅ Syntax fixed successfully!');
      }
      
      // Save the fixed version
      const diagramPath = path.join(repoPath, 'DIAGRAM.md');
      await fs.writeFile(diagramPath, fixedContent, 'utf-8');
      console.log(`\n✅ Diagram saved to DIAGRAM.md`);
    } else {
      console.log('✅ Mermaid syntax is valid!');
      
      // Save the diagram
      const diagramPath = path.join(repoPath, 'DIAGRAM.md');
      await fs.writeFile(diagramPath, diagramContent, 'utf-8');
      console.log(`\n✅ Diagram saved to DIAGRAM.md`);
    }
  } catch (error: any) {
    console.error('Error generating diagram:', error.message || error);
    process.exit(1);
  }
}

async function handleSync(deep: boolean = false) {
  console.log(deep ? 'Running deep sync (full history)...' : 'Running sync (latest commits)...\n');
  
  await setupServices();
  
  const repoPath = process.cwd();
  const summarizer = new Summarizer();
  const memoryManager = new MemoryManager(repoPath);
  const gitUtils = new GitUtils(repoPath);
  const watcher = new Watcher(repoPath);

  try {
    if (deep) {
      // Process full history
      console.log('Processing full Git history (this may take a while)...');
      
      // Get all commits (or a large number)
      const commits = await gitUtils.getLatestCommits(1000); // Process up to 1000 commits
      
      console.log(`Processing ${commits.length} commits...`);
      
      // Process in batches
      const batchSize = 10;
      let currentMemory = await memoryManager.readMemory();
      
      for (let i = 0; i < commits.length; i += batchSize) {
        const batch = commits.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(commits.length / batchSize)}...`);
        
        const diffs: string[] = [];
        for (const commit of batch) {
          try {
            const diff = await gitUtils.getCommitDiff(commit.hash);
            diffs.push(`## Commit: ${commit.message}\n\n${diff}`);
          } catch (error) {
            console.warn(`Skipping commit ${commit.hash}:`, error);
          }
        }
        
        const combinedDiff = diffs.join('\n\n---\n\n');
        currentMemory = await summarizer.summarizeDiff(combinedDiff, currentMemory, 'flash');
      }
      
      await memoryManager.writeMemory(currentMemory);
      const currentHead = await gitUtils.getHeadCommit();
      await watcher.setLastProcessedCommit(currentHead);
      
      console.log('✅ Deep sync complete!');
    } else {
      // Process latest commit(s)
      const lastProcessed = await watcher.getLastProcessedCommit();
      const currentHead = await gitUtils.getHeadCommit();
      
      if (lastProcessed === currentHead) {
        // No new commit, check for unstaged changes as draft memory
        const unstagedDiff = await gitUtils.getUnstagedDiff();
        if (unstagedDiff && unstagedDiff.trim().length > 0) {
          console.log('No new commit, but unstaged changes detected. Creating draft memory...');
          
          // Read current memory
          const currentMemory = await memoryManager.readMemory();
          
          // Prefix with draft note
          const draftDiff = `## Draft Changes (Unstaged)\n\n${unstagedDiff}`;
          
          // Summarize and update (using flash for routine summarization)
          const updatedMemory = await summarizer.summarizeDiff(draftDiff, currentMemory, 'flash');
          
          // Write updated memory
          await memoryManager.writeMemory(updatedMemory);
          
          console.log('✅ Draft memory sync complete!');
          return;
        }
        console.log('No new commits to process.');
        return;
      }

      console.log('Processing latest commit...');
      
      // Get diff for the new commit using latest commit diff method
      const diff = await gitUtils.getLatestCommitDiff();
      
      if (!diff || diff.trim().length === 0) {
        console.log('No diff found for latest commit. Updating state and skipping...');
        await watcher.setLastProcessedCommit(currentHead);
        return;
      }
      
      const currentMemory = await memoryManager.readMemory();
      
      const updatedMemory = await summarizer.summarizeDiff(diff, currentMemory, 'flash');
      await memoryManager.writeMemory(updatedMemory);
      
      await watcher.setLastProcessedCommit(currentHead);
      
      console.log('✅ Sync complete!');
    }
  } catch (error) {
    console.error('Error during sync:', error);
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log(`
VibeGuard Librarian - Context Management Tool

Usage:
  vibeguard init              Initialize and create PROJECT_MEMORY.md
  vibeguard watch             Start watching for Git changes
  vibeguard sync              Process latest commit(s)
  vibeguard sync --deep       Process full Git history
  vibeguard check             Run health check (env, API key, Git, memory)
  vibeguard visualize         Generate architecture diagram (DIAGRAM.md)
  vibeguard dashboard         Start the VibeGuard dashboard server

For more information, visit: https://github.com/cdaviddav/vibeguard
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case COMMANDS.INIT:
        await handleInit(); // Uses new interactive wizard
        break;

      case COMMANDS.WATCH:
        await handleWatch();
        break;

      case COMMANDS.SYNC:
        const deep = args.includes('--deep');
        await handleSync(deep);
        break;

      case COMMANDS.CHECK:
        await handleCheck();
        break;

      case COMMANDS.VISUALIZE:
        await handleVisualize();
        break;

      case COMMANDS.DASHBOARD:
        await handleDashboard();
        break;

      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run `vibeguard` without arguments to see usage.');
        process.exit(1);
    }
  } catch (error: any) {
    console.error('Error:', error.message || error);
    process.exit(1);
  }
}

// Run main function (this is the entry point)
main().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});

