import simpleGit, { SimpleGit, LogResult, Commit } from 'simple-git';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface OnelineCommit {
  hash: string;
  message: string;
  date: string;
}

export class GitUtils {
  private git: SimpleGit;
  private repoPath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.git = simpleGit(repoPath);
  }

  /**
   * Get the latest N commits
   */
  async getLatestCommits(count: number): Promise<Commit[]> {
    const log = await this.git.log({ maxCount: count });
    return log.all;
  }

  /**
   * Get the diff for a specific commit
   */
  async getCommitDiff(commitHash: string): Promise<string> {
    try {
      const diff = await this.git.show([commitHash, '--format=']);
      return diff;
    } catch (error) {
      throw new Error(`Failed to get diff for commit ${commitHash}: ${error}`);
    }
  }

  /**
   * Get oneline log (last N commits or since date)
   */
  async getOnelineLog(limit: number, since?: string): Promise<OnelineCommit[]> {
    const options: any = { maxCount: limit, format: { hash: '%H', date: '%ai', message: '%s' } };
    
    if (since) {
      options.since = since;
    }

    const log = await this.git.log(options);
    return log.all.map(commit => ({
      hash: commit.hash,
      message: commit.message,
      date: commit.date,
    }));
  }

  /**
   * Get current HEAD commit hash
   */
  async getHeadCommit(): Promise<string> {
    const log = await this.git.log({ maxCount: 1 });
    if (log.latest) {
      return log.latest.hash;
    }
    throw new Error('No commits found in repository');
  }

  /**
   * Get file structure as a tree-like string
   */
  async getFileStructure(): Promise<string> {
    const files: string[] = [];
    
    async function walkDir(dir: string, prefix: string = '', depth: number = 0): Promise<void> {
      if (depth > 5) return; // Limit depth to avoid huge trees
      
      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        
        // Filter out common ignore patterns
        const filtered = entries.filter(entry => {
          const name = entry.name;
          return !name.startsWith('.') && 
                 name !== 'node_modules' && 
                 name !== 'dist' && 
                 name !== 'build' &&
                 name !== '.next' &&
                 name !== 'out';
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

    await walkDir(this.repoPath);
    return files.join('\n');
  }

  /**
   * Check if a file is in .gitignore
   */
  async isInGitignore(filePath: string): Promise<boolean> {
    try {
      const gitignorePath = path.join(this.repoPath, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n').map(line => line.trim());
      
      // Simple check - see if file path matches any pattern
      const relativePath = path.relative(this.repoPath, filePath).replace(/\\/g, '/');
      
      for (const line of lines) {
        if (!line || line.startsWith('#')) continue;
        
        // Simple pattern matching (basic implementation)
        const pattern = line.replace(/^\//, ''); // Remove leading slash
        if (relativePath === pattern || relativePath.includes(pattern)) {
          return true;
        }
      }
      
      return false;
    } catch (error) {
      // .gitignore doesn't exist or can't be read
      return false;
    }
  }

  /**
   * Remove a file pattern from .gitignore
   */
  async removeFromGitignore(filePath: string): Promise<void> {
    try {
      const gitignorePath = path.join(this.repoPath, '.gitignore');
      const content = await fs.readFile(gitignorePath, 'utf-8');
      const lines = content.split('\n');
      
      const relativePath = path.relative(this.repoPath, filePath).replace(/\\/g, '/');
      const filtered = lines.filter(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) return true;
        return trimmed !== relativePath && !trimmed.includes(relativePath);
      });
      
      await fs.writeFile(gitignorePath, filtered.join('\n'), 'utf-8');
    } catch (error) {
      // .gitignore doesn't exist - that's fine, file isn't ignored
    }
  }

  /**
   * Stage a file
   */
  async stageFile(filePath: string): Promise<void> {
    const relativePath = path.relative(this.repoPath, filePath).replace(/\\/g, '/');
    await this.git.add(relativePath);
  }

  /**
   * Check if content has Git conflict markers
   */
  hasConflictMarkers(content: string): boolean {
    return /^<<<<<<< |^=======$|^>>>>>>> /m.test(content);
  }

  /**
   * Read README.md if it exists
   */
  async readReadme(): Promise<string | null> {
    const readmePaths = ['README.md', 'readme.md', 'README.txt', 'readme.txt'];
    
    for (const readmePath of readmePaths) {
      try {
        const fullPath = path.join(this.repoPath, readmePath);
        const content = await fs.readFile(fullPath, 'utf-8');
        return content;
      } catch (error) {
        // File doesn't exist, try next
      }
    }
    
    return null;
  }
}

