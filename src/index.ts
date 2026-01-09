#!/usr/bin/env node

import { Initializer } from './librarian/initializer';
import { Watcher } from './librarian/watcher';
import { Summarizer } from './librarian/summarizer';
import { MemoryManager } from './librarian/memory-manager';
import { GitUtils } from './utils/git';
import { getApiKey } from './utils/config';

const COMMANDS = {
  INIT: 'init',
  WATCH: 'watch',
  SYNC: 'sync',
} as const;

async function setupServices() {
  // Validate API key is available
  try {
    await getApiKey();
  } catch (error: any) {
    console.error(error.message);
    process.exit(1);
  }
}

async function handleInit() {
  console.log('Initializing VibeGuard Librarian...\n');
  
  await setupServices();
  const initializer = new Initializer();
  await initializer.initialize();
  
  console.log('\n✅ Initialization complete! You can now run `vibeguard watch` to start monitoring.');
}

async function handleWatch() {
  console.log('Starting VibeGuard Librarian watcher...\n');
  
  await setupServices();
  
  const repoPath = process.cwd();
  const watcher = new Watcher(repoPath);
  const summarizer = new Summarizer();
  const memoryManager = new MemoryManager(repoPath);
  const gitUtils = new GitUtils(repoPath);

  // Set up commit processing callback
  watcher.onCommitDetected(async () => {
    try {
      console.log('New commit detected, processing...');
      
      const lastProcessed = await watcher.getLastProcessedCommit();
      const currentHead = await gitUtils.getHeadCommit();
      
      if (lastProcessed === currentHead) {
        return; // Already processed
      }

      // Get diff for the new commit
      const diff = await gitUtils.getCommitDiff(currentHead);
      
      // Read current memory
      const currentMemory = await memoryManager.readMemory();
      
      // Summarize and update
      const updatedMemory = await summarizer.summarizeDiff(diff, currentMemory, 'medium');
      
      // Write updated memory
      await memoryManager.writeMemory(updatedMemory);
      
      // Update last processed commit
      await watcher.setLastProcessedCommit(currentHead);
      
      console.log('✅ Memory updated successfully');
    } catch (error) {
      console.error('Error processing commit:', error);
    }
  });

  // Start watching
  await watcher.startWatching();

  // Handle graceful shutdown
  process.on('SIGINT', async () => {
    console.log('\nShutting down watcher...');
    await watcher.stopWatching();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nShutting down watcher...');
    await watcher.stopWatching();
    process.exit(0);
  });

  // Keep process alive
  console.log('Watcher is running. Press Ctrl+C to stop.\n');
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
        currentMemory = await summarizer.summarizeDiff(combinedDiff, currentMemory, 'medium');
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
        console.log('No new commits to process.');
        return;
      }

      console.log('Processing latest commit...');
      
      const diff = await gitUtils.getCommitDiff(currentHead);
      const currentMemory = await memoryManager.readMemory();
      
      const updatedMemory = await summarizer.summarizeDiff(diff, currentMemory, 'medium');
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

For more information, visit: https://github.com/cdaviddav/vibeguard
`);
    process.exit(0);
  }

  try {
    switch (command) {
      case COMMANDS.INIT:
        await handleInit();
        break;

      case COMMANDS.WATCH:
        await handleWatch();
        break;

      case COMMANDS.SYNC:
        const deep = args.includes('--deep');
        await handleSync(deep);
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

// Run if this file is executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

