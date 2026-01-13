import { GitUtils } from '../utils/git';
import { Summarizer } from './summarizer';
import { MemoryManager } from './memory-manager';
import * as path from 'path';

export interface MilestoneCommit {
  hash: string;
  message: string;
  date: string;
  type: 'tag' | 'merge' | 'keyword' | 'other';
}

export interface MilestoneTimeline {
  milestones: MilestoneCommit[];
  totalCommits: number;
}

export class Initializer {
  private repoPath: string;
  private gitUtils: GitUtils;
  private summarizer: Summarizer;
  private memoryManager: MemoryManager;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.gitUtils = new GitUtils(repoPath);
    this.summarizer = new Summarizer();
    this.memoryManager = new MemoryManager(repoPath);
  }

  /**
   * Ensure PROJECT_MEMORY.md is tracked in Git
   */
  async ensureMemoryTrackedInGit(): Promise<void> {
    const memoryPath = path.join(this.repoPath, 'PROJECT_MEMORY.md');
    const isIgnored = await this.gitUtils.isInGitignore(memoryPath);

    if (isIgnored) {
      console.log('Removing PROJECT_MEMORY.md from .gitignore...');
      await this.gitUtils.removeFromGitignore(memoryPath);
    }

    // Stage the file if it exists
    try {
      await this.gitUtils.stageFile(memoryPath);
    } catch (error) {
      // File doesn't exist yet - that's fine
    }
  }

  /**
   * Tier 1: Oneline Sweep (0 tokens)
   * Parse git log locally to identify milestone commits
   */
  async tier1OnelineSweep(): Promise<MilestoneTimeline> {
    console.log('Tier 1: Analyzing commit history (oneline sweep)...');

    try {
      // Get last 100 commits or last 6 months
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
      const since = sixMonthsAgo.toISOString().split('T')[0];

      const commits = await this.gitUtils.getOnelineLog(100, since);
      
      if (commits.length === 0) {
        console.log('No commit history found. This appears to be a brand new repository.');
        return {
          milestones: [],
          totalCommits: 0,
        };
      }
      
      const milestones: MilestoneCommit[] = [];

    // Keywords that indicate significant changes
    const significantKeywords = [
      'refactor',
      'architecture',
      'init',
      'migration',
      'restructure',
      'redesign',
      'major',
      'breaking',
    ];

    for (const commit of commits) {
      let type: MilestoneCommit['type'] = 'other';
      const message = commit.message.toLowerCase();

      // Check for tags (we'd need to check git tags separately)
      // For now, we'll focus on merge commits and keywords

      // Check for merge commits
      if (message.includes('merge') || commit.hash.includes('merge')) {
        type = 'merge';
        milestones.push({
          hash: commit.hash,
          message: commit.message,
          date: commit.date,
          type,
        });
        continue;
      }

      // Check for significant keywords
      for (const keyword of significantKeywords) {
        if (message.includes(keyword)) {
          type = 'keyword';
          milestones.push({
            hash: commit.hash,
            message: commit.message,
            date: commit.date,
            type,
          });
          break;
        }
      }
    }

      console.log(`Found ${milestones.length} milestone commits out of ${commits.length} total`);

      return {
        milestones,
        totalCommits: commits.length,
      };
    } catch (error: any) {
      // Fallback for brand new repositories or Git errors
      console.warn('Could not analyze commit history:', error.message || error);
      console.log('Continuing with empty history...');
      return {
        milestones: [],
        totalCommits: 0,
      };
    }
  }

  /**
   * Tier 2: Deep Context (Mid-cost)
   * Process last 5-10 commits with Gemini
   */
  async tier2DeepContext(): Promise<string> {
    console.log('Tier 2: Processing recent commits (deep context)...');

    const commitCount = 10; // Process last 10 commits
    const commits = await this.gitUtils.getLatestCommits(commitCount);

    if (commits.length === 0) {
      return '';
    }

    // Get diffs for all commits
    const diffs: string[] = [];
    for (const commit of commits) {
      try {
        const diff = await this.gitUtils.getCommitDiff(commit.hash);
        diffs.push(`## Commit: ${commit.message}\n\n${diff}`);
      } catch (error) {
        console.warn(`Failed to get diff for commit ${commit.hash}:`, error);
      }
    }

    const combinedDiff = diffs.join('\n\n---\n\n');

    // Read current memory if it exists
    const currentMemory = await this.memoryManager.readMemory();

    // Summarize with Gemini
    const updatedMemory = await this.summarizer.summarizeDiff(
      combinedDiff,
      currentMemory,
      'medium' // Medium thinking level for routine summaries
    );

    return updatedMemory;
  }

  /**
   * Tier 3: Skeleton Scan (High value)
   * Infer architecture from file structure and README
   */
  async tier3SkeletonScan(): Promise<string> {
    console.log('Tier 3: Analyzing project structure (skeleton scan)...');

    // Get file structure
    const fileStructure = await this.gitUtils.getFileStructure();

    // Read README if it exists
    const readme = await this.gitUtils.readReadme();

    // Infer architecture with high thinking level
    const memory = await this.summarizer.inferArchitecture(
      fileStructure,
      readme || undefined,
      'high' // High thinking level for architecture inference
    );

    return memory;
  }

  /**
   * Main initialization orchestrator
   */
  async initialize(): Promise<void> {
    console.log('Starting three-tier initialization...\n');

    // Ensure memory is tracked in Git
    await this.ensureMemoryTrackedInGit();

    // Tier 1: Oneline sweep (0 tokens, local only)
    const timeline = await this.tier1OnelineSweep();
    console.log(`Tier 1 complete: ${timeline.milestones.length} milestones identified\n`);

    // Tier 2: Deep context (process recent commits)
    let tier2Memory = '';
    try {
      tier2Memory = await this.tier2DeepContext();
      console.log('Tier 2 complete: Recent commits processed\n');
    } catch (error) {
      console.error('Tier 2 error:', error);
      // Continue with Tier 3 even if Tier 2 fails
    }

    // Tier 3: Skeleton scan (infer architecture)
    let tier3Memory = '';
    try {
      tier3Memory = await this.tier3SkeletonScan();
      console.log('Tier 3 complete: Architecture inferred\n');
    } catch (error) {
      console.error('Tier 3 error:', error);
      throw error; // Tier 3 is critical
    }

    // Merge Tier 2 and Tier 3 results
    // If we have Tier 2 results, use them as base and enhance with Tier 3
    // Otherwise, use Tier 3 as the base
    let finalMemory = tier2Memory || tier3Memory;

    // If we have both, merge them intelligently
    if (tier2Memory && tier3Memory && tier2Memory !== tier3Memory) {
      // Use Tier 3 as base (architecture) and merge Tier 2 (recent decisions)
      // The summarizer can handle this by using Tier 2 as "current memory" and Tier 3 as "new diff"
      finalMemory = await this.summarizer.summarizeDiff(
        `# Architecture Update\n\n${tier3Memory}`,
        tier2Memory,
        'high'
      );
    }

    // Write the final memory
    await this.memoryManager.writeMemory(finalMemory);

    console.log('Initialization complete! PROJECT_MEMORY.md has been created/updated.');
  }
}