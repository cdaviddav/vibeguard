import * as chokidar from 'chokidar';
import * as path from 'path';
import * as fs from 'fs/promises';
import { GitUtils } from '../utils/git';

interface WatcherState {
  lastProcessedCommit: string | null;
  isProcessing: boolean;
}

export class Watcher {
  private repoPath: string;
  private gitUtils: GitUtils;
  private statePath: string;
  private watcher: chokidar.FSWatcher | null = null;
  private onCommitCallback: (() => Promise<void>) | null = null;
  private debounceTimer: NodeJS.Timeout | null = null;
  private debounceDelay = 500; // 500ms debounce

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.gitUtils = new GitUtils(repoPath);
    this.statePath = path.join(repoPath, '.vibeguard', 'state.json');
  }

  /**
   * Load state from file
   */
  private async loadState(): Promise<WatcherState> {
    try {
      const content = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(content) as WatcherState;
    } catch (error) {
      // State file doesn't exist - return default
      return {
        lastProcessedCommit: null,
        isProcessing: false,
      };
    }
  }

  /**
   * Save state to file
   */
  private async saveState(state: WatcherState): Promise<void> {
    // Ensure .vibeguard directory exists
    const stateDir = path.dirname(this.statePath);
    await fs.mkdir(stateDir, { recursive: true });

    await fs.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Detect if there's a new commit
   */
  async detectNewCommit(): Promise<string | null> {
    try {
      const currentHead = await this.gitUtils.getHeadCommit();
      const state = await this.loadState();

      if (state.lastProcessedCommit === currentHead) {
        return null; // No new commit
      }

      return currentHead;
    } catch (error) {
      console.error('Error detecting new commit:', error);
      return null;
    }
  }

  /**
   * Process a new commit (called by debounced handler)
   */
  private async processNewCommit(): Promise<void> {
    const state = await this.loadState();

    // Prevent concurrent processing
    if (state.isProcessing) {
      return;
    }

    const newCommit = await this.detectNewCommit();
    if (!newCommit) {
      return; // No new commit
    }

    // Mark as processing
    await this.saveState({ ...state, isProcessing: true });

    try {
      // Call the callback if registered
      if (this.onCommitCallback) {
        await this.onCommitCallback();
      }

      // Update last processed commit
      await this.saveState({
        lastProcessedCommit: newCommit,
        isProcessing: false,
      });
    } catch (error) {
      console.error('Error processing commit:', error);
      // Reset processing flag on error
      await this.saveState({
        ...state,
        isProcessing: false,
      });
    }
  }

  /**
   * Debounced commit handler
   */
  private handleChange(): void {
    // Clear existing timer
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
    }

    // Set new timer
    this.debounceTimer = setTimeout(() => {
      this.processNewCommit().catch(error => {
        console.error('Error in debounced commit handler:', error);
      });
    }, this.debounceDelay);
  }

  /**
   * Start watching for Git changes
   */
  async startWatching(): Promise<void> {
    // Reset any stale processing flag on startup (in case watcher was interrupted)
    const state = await this.loadState();
    if (state.isProcessing) {
      await this.saveState({
        ...state,
        isProcessing: false,
      });
    }

    const gitPath = path.join(this.repoPath, '.git');
    const headPath = path.join(gitPath, 'HEAD');
    const indexPath = path.join(gitPath, 'index');
    
    // Get current branch and watch the branch ref file (which actually changes on commits)
    const currentBranch = await this.gitUtils.getCurrentBranch();
    const branchRefPath = path.join(gitPath, 'refs', 'heads', currentBranch);

    // Watch HEAD, index, and the branch ref file (branch ref file changes on commits)
    const pathsToWatch = [headPath, indexPath, branchRefPath];
    this.watcher = chokidar.watch(pathsToWatch, {
      persistent: true,
      ignoreInitial: true,
      ignored: [
        /\.vibeguard/, 
        /PROJECT_MEMORY\.md/,
        /\.git\/.*\.lock$/, // OPTIMIZATION: Ignore Git lock files explicitly
        /\.git\/COMMIT_EDITMSG$/ // OPTIMIZATION: Often noisy, focus on HEAD/refs
      ],
      awaitWriteFinish: {
        stabilityThreshold: 1000, // Increased to 1 second for slower file systems
        pollInterval: 500, // Increased to 500ms to give Git operations time to finalize
      },
    });

    this.watcher.on('change', () => {
      this.handleChange();
    });

    this.watcher.on('error', (error: any) => {
      console.error('Watcher error:', error);
    });

    console.log('Watching for Git changes...');
  }

  /**
   * Register callback for when a commit is detected
   */
  onCommitDetected(callback: () => Promise<void>): void {
    this.onCommitCallback = callback;
  }

  /**
   * Stop watching
   */
  async stopWatching(): Promise<void> {
    if (this.debounceTimer) {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = null;
    }

    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
    }
  }

  /**
   * Get last processed commit hash
   */
  async getLastProcessedCommit(): Promise<string | null> {
    const state = await this.loadState();
    return state.lastProcessedCommit;
  }

  /**
   * Set last processed commit (useful for initialization)
   */
  async setLastProcessedCommit(commitHash: string): Promise<void> {
    const state = await this.loadState();
    await this.saveState({
      ...state,
      lastProcessedCommit: commitHash,
    });
  }
}

