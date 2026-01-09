import * as fs from 'fs/promises';
import * as path from 'path';
import writeFileAtomic from 'write-file-atomic';
import { GitUtils } from '../utils/git';
import { generateSummary } from '../utils/llm';
import { estimateTokens } from '../utils/llm';

const MEMORY_FILE = 'PROJECT_MEMORY.md';
const REQUIRED_SECTIONS = [
  '## Project Soul',
  '## Tech Stack',
  '## Architecture',
  '## Core Rules',
  '## Recent Decisions',
  '## Active Tech Debt',
];

export class MemoryManager {
  private repoPath: string;
  private gitUtils: GitUtils;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.gitUtils = new GitUtils(repoPath);
  }

  /**
   * Get the full path to PROJECT_MEMORY.md
   */
  private getMemoryPath(): string {
    return path.join(this.repoPath, MEMORY_FILE);
  }

  /**
   * Read existing PROJECT_MEMORY.md
   */
  async readMemory(): Promise<string> {
    const memoryPath = this.getMemoryPath();
    
    try {
      const content = await fs.readFile(memoryPath, 'utf-8');
      
      // Check for conflict markers
      if (this.gitUtils.hasConflictMarkers(content)) {
        // Resolve conflicts using Gemini
        return await this.resolveConflicts(content);
      }
      
      return content;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        // File doesn't exist - return empty string
        return '';
      }
      throw error;
    }
  }

  /**
   * Validate memory file structure
   */
  validateMemoryStructure(content: string): boolean {
    if (!content || content.trim().length === 0) {
      return false; // Empty file is invalid
    }

    // Check for all required sections
    for (const section of REQUIRED_SECTIONS) {
      if (!content.includes(section)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Compress memory if it exceeds 1,500 words
   */
  compressIfNeeded(content: string): string {
    // Rough word count (split by whitespace)
    const words = content.split(/\s+/).filter(w => w.length > 0);
    
    if (words.length <= 1500) {
      return content;
    }

    // Need to compress - remove oldest "Recent Decisions"
    const lines = content.split('\n');
    const compressed: string[] = [];
    let inRecentDecisions = false;
    let decisionCount = 0;
    const maxDecisions = 5; // Keep only last 5

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (line.includes('## Recent Decisions')) {
        inRecentDecisions = true;
        compressed.push(line);
        continue;
      }

      if (inRecentDecisions) {
        // Check if we've moved to next section
        if (line.startsWith('## ')) {
          inRecentDecisions = false;
          compressed.push(line);
          continue;
        }

        // Count decisions (numbered items or date headers)
        if (line.match(/^\d+\.|^\*\*.*:\*\*/)) {
          decisionCount++;
          if (decisionCount <= maxDecisions) {
            // Keep this decision and its content
            let j = i;
            while (j < lines.length && !lines[j].match(/^\d+\.|^\*\*.*:\*\*|^## /)) {
              if (j === i || lines[j].trim().length > 0) {
                compressed.push(lines[j]);
              }
              j++;
            }
            i = j - 1;
            continue;
          }
          // Skip this decision (too old)
          let j = i + 1;
          while (j < lines.length && !lines[j].match(/^\d+\.|^\*\*.*:\*\*|^## /)) {
            j++;
          }
          i = j - 1;
          continue;
        }
      }

      compressed.push(line);
    }

    return compressed.join('\n');
  }

  /**
   * Write memory file atomically
   */
  async writeMemory(content: string): Promise<void> {
    // Validate structure
    if (!this.validateMemoryStructure(content)) {
      throw new Error('Invalid PROJECT_MEMORY.md structure: missing required sections');
    }

    // Compress if needed
    const compressed = this.compressIfNeeded(content);

    // Write atomically
    const memoryPath = this.getMemoryPath();
    await writeFileAtomic(memoryPath, compressed, 'utf-8');

    // Auto-stage the file
    await this.stageMemoryFile();
  }

  /**
   * Stage PROJECT_MEMORY.md in Git
   */
  async stageMemoryFile(): Promise<void> {
    const memoryPath = this.getMemoryPath();
    await this.gitUtils.stageFile(memoryPath);
  }

  /**
   * Resolve Git conflicts using Gemini
   */
  async resolveConflicts(conflictedContent: string): Promise<string> {
    const conflictPrompt = `You are "The Librarian," an expert Software Architect and Context Manager.

# TASK
Merge the following conflicted PROJECT_MEMORY.md file. The file contains Git conflict markers (<<<<<<<, =======, >>>>>>>).

# INSTRUCTIONS
1. Remove all conflict markers (<<<<<<<, =======, >>>>>>>)
2. Intelligently merge the conflicting sections, preserving important information from both versions
3. Maintain the required structure:
   - ## Project Soul
   - ## Tech Stack
   - ## Architecture
   - ## Core Rules
   - ## Recent Decisions (The "Why")
   - ## Active Tech Debt
4. Keep the file under 1,500 words
5. Return the complete, merged Markdown file with no conflict markers

# CONFLICTED FILE
${conflictedContent}

# OUTPUT
Return only the merged Markdown content, no explanations.`;

    const systemPrompt = `You are a Git conflict resolution expert specializing in Markdown files about software architecture.`;

    try {
      const merged = await generateSummary(conflictPrompt, systemPrompt, {
        thinkingLevel: 'high',
        temperature: 0.2, // Lower temperature for more consistent merging
      });

      // Validate the merged result
      if (this.gitUtils.hasConflictMarkers(merged)) {
        throw new Error('Conflict resolution failed: merged content still contains conflict markers');
      }

      return merged;
    } catch (error) {
      throw new Error(`Failed to resolve conflicts: ${error}`);
    }
  }
}

