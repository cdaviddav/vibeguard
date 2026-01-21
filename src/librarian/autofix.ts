import * as fs from 'fs/promises';
import * as path from 'path';
import { OracleService, Prophecy } from './oracle.js';
import { GitUtils } from '../utils/git.js';
import { generateSummary } from '../utils/llm.js';
import writeFileAtomic from 'write-file-atomic';
import { simpleGit, SimpleGit } from 'simple-git';

export interface FixResult {
  success: boolean;
  branchName?: string;
  error?: string;
  filesChanged?: string[];
}

export class AutoFixService {
  private repoPath: string;
  private gitUtils: GitUtils;
  private oracleService: OracleService;
  private git: SimpleGit;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.gitUtils = new GitUtils(repoPath);
    this.oracleService = new OracleService(repoPath);
    this.git = simpleGit(repoPath);
  }

  /**
   * Apply a fix for a prophecy by creating a git branch and refactoring code
   */
  async applyFix(prophecyId: string): Promise<FixResult> {
    try {
      // Step 1: Retrieve prophecy
      const prophecies = await this.oracleService.getProphecies();
      const prophecy = prophecies.find(p => p.id === prophecyId);

      if (!prophecy) {
        return {
          success: false,
          error: `Prophecy with id ${prophecyId} not found`,
        };
      }

      // Step 2: Check for clean working directory
      const hasUncommittedChanges = await this.checkUncommittedChanges();
      if (hasUncommittedChanges) {
        return {
          success: false,
          error: 'Working directory has uncommitted changes. Please commit or stash changes before applying fixes.',
        };
      }

      // Step 3: Create git branch with unique name
      // Store original branch before switching
      const originalBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
      
      const shortId = prophecyId.split('-').pop()?.substring(0, 8) || 'fix';
      let branchName = `vibeguard/fix-${shortId}`;
      let branchSuffix = 0;
      let branchCreated = false;

      // Find main/master branch name
      const branches = await this.git.branchLocal();
      const mainBranch = branches.all.find(b => b === 'main' || b === 'master') || 'main';

      // Check if branch exists and make it unique if needed
      while (true) {
        try {
          const branchExists = branches.all.some(b => b === branchName || b === `refs/heads/${branchName}`);
          
          if (!branchExists) {
            // Branch doesn't exist, create it from main branch
            await this.git.checkout(mainBranch);
            await this.git.checkoutLocalBranch(branchName);
            branchCreated = true;
            break;
          } else {
            // Branch exists, check its state
            try {
              const branchRef = await this.git.revparse(['--abbrev-ref', branchName]);
              const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
              
              // If we're already on this branch, check if it's clean
              if (branchRef === currentBranch) {
                const status = await this.git.status();
                const isClean = status.files.length === 0 && 
                               status.not_added.length === 0 &&
                               status.modified.length === 0;
                
                if (isClean) {
                  // Branch exists and is clean - check if it's at base (main) commit
                  const mainCommit = await this.git.revparse([mainBranch]);
                  const branchCommit = await this.git.revparse([branchName]);
                  
                  if (branchCommit === mainCommit) {
                    // Branch is at base commit - safe to reuse
                    console.warn(`[AutoFix] Branch ${branchName} already exists and is clean. Reusing it.`);
                    branchCreated = false;
                    break;
                  } else {
                    // Branch has commits - create new unique branch
                    branchSuffix++;
                    branchName = `vibeguard/fix-${shortId}-${branchSuffix}`;
                    continue;
                  }
                } else {
                  // Branch has uncommitted changes - create new unique branch
                  branchSuffix++;
                  branchName = `vibeguard/fix-${shortId}-${branchSuffix}`;
                  continue;
                }
              } else {
                // Branch exists but we're not on it - check if it's at base commit
                const mainCommit = await this.git.revparse([mainBranch]);
                let branchCommit: string;
                try {
                  branchCommit = await this.git.revparse([branchName]);
                } catch {
                  // Branch might not exist in current repo state, create it
                  await this.git.checkout(mainBranch);
                  await this.git.checkoutLocalBranch(branchName);
                  branchCreated = true;
                  break;
                }
                
                // If branch is at the same commit as main, we can use it
                if (branchCommit === mainCommit) {
                  await this.git.checkout(branchName);
                  branchCreated = false;
                  break;
                } else {
                  // Branch has diverged - create new unique branch
                  branchSuffix++;
                  branchName = `vibeguard/fix-${shortId}-${branchSuffix}`;
                  continue;
                }
              }
            } catch (error: any) {
              // Error checking branch state - try unique name
              branchSuffix++;
              branchName = `vibeguard/fix-${shortId}-${branchSuffix}`;
              continue;
            }
          }
        } catch (error: any) {
          // If checkout fails for any reason, try unique name
          if (error.message?.includes('already exists') || error.message?.includes('branch already exists')) {
            branchSuffix++;
            branchName = `vibeguard/fix-${shortId}-${branchSuffix}`;
            continue;
          }
          throw error;
        }
      }

      // Step 4: Identify affected files using AI
      const affectedFiles = await this.identifyAffectedFiles(prophecy);

      if (affectedFiles.length === 0) {
        // Switch back to original branch if no files found
        const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        
        // Only clean up if we created a new branch (not reused existing)
        if (branchCreated && (currentBranch === branchName || currentBranch.endsWith(`/${branchName}`))) {
          await this.git.checkout(originalBranch);
          // Only delete if branch has no commits
          try {
            const branchLog = await this.git.log([branchName, '--oneline']);
            if (branchLog.total === 0) {
              await this.git.branch(['-D', branchName]);
            }
          } catch {
            // Branch might not have any log entries, try to delete anyway
            try {
              await this.git.branch(['-D', branchName]);
            } catch {
              // Ignore deletion errors
            }
          }
        } else if (currentBranch === branchName || currentBranch.endsWith(`/${branchName}`)) {
          // If we're on the branch but didn't create it, switch back
          await this.git.checkout(originalBranch);
        }
        
        return {
          success: false,
          error: 'Could not identify files to fix. The prophecy may require manual intervention.',
        };
      }

      // Step 5: Apply fixes using AI
      const projectMemory = await this.readProjectMemory();
      const filesChanged: string[] = [];

      for (const filePath of affectedFiles) {
        try {
          const fullPath = path.join(this.repoPath, filePath);
          const originalContent = await fs.readFile(fullPath, 'utf-8');

          const fixedContent = await this.applyFixToFile(
            filePath,
            originalContent,
            prophecy,
            projectMemory
          );

          if (fixedContent !== originalContent) {
            // Write file atomically
            await writeFileAtomic(fullPath, fixedContent, 'utf-8');
            filesChanged.push(filePath);
          }
        } catch (error: any) {
          console.error(`[AutoFix] Failed to fix file ${filePath}:`, error.message);
          // Continue with other files
        }
      }

      if (filesChanged.length === 0) {
        // No files were changed - clean up branch
        const currentBranch = await this.git.revparse(['--abbrev-ref', 'HEAD']);
        
        // Only clean up if we created a new branch (not reused existing)
        if (branchCreated && (currentBranch === branchName || currentBranch.endsWith(`/${branchName}`))) {
          await this.git.checkout(originalBranch);
          // Only delete if branch has no commits
          try {
            const branchLog = await this.git.log([branchName, '--oneline']);
            if (branchLog.total === 0) {
              await this.git.branch(['-D', branchName]);
            }
          } catch {
            // Branch might not have any log entries, try to delete anyway
            try {
              await this.git.branch(['-D', branchName]);
            } catch {
              // Ignore deletion errors - branch might have commits
            }
          }
        } else if (currentBranch === branchName || currentBranch.endsWith(`/${branchName}`)) {
          // If we're on the branch but didn't create it, switch back
          await this.git.checkout(originalBranch);
        }
        
        return {
          success: false,
          error: 'No changes were made. The files may already be in the correct state or the fix could not be applied automatically.',
        };
      }

      // Step 6: Stage and commit changes
      await this.git.add('.');
      await this.git.commit(`VibeGuard: ${prophecy.title}`);

      return {
        success: true,
        branchName,
        filesChanged,
      };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Failed to apply fix',
      };
    }
  }

  /**
   * Check if there are uncommitted changes in the working directory
   */
  private async checkUncommittedChanges(): Promise<boolean> {
    try {
      const status = await this.git.status();
      return (
        status.files.length > 0 ||
        status.not_added.length > 0 ||
        status.conflicted.length > 0 ||
        status.created.length > 0 ||
        status.deleted.length > 0 ||
        status.modified.length > 0 ||
        status.renamed.length > 0
      );
    } catch (error) {
      // If status check fails, assume there are no uncommitted changes
      return false;
    }
  }

  /**
   * Identify which files are affected by the prophecy using AI
   */
  private async identifyAffectedFiles(prophecy: Prophecy): Promise<string[]> {
    const systemPrompt = `You are a code analyzer. Given a prophecy about architectural drift, identify the specific file paths that need to be modified to fix the issue.

Return your response as a JSON array of file paths (relative to the repository root). Only include files that directly need changes. If you cannot identify specific files, return an empty array.

Example response: ["src/components/App.tsx", "src/utils/helpers.ts"]`;

    const userPrompt = `Prophecy:
Title: ${prophecy.title}
Type: ${prophecy.type}
Description: ${prophecy.description}
Suggested Action: ${prophecy.suggestedAction}

Analyze the above prophecy and identify which files need to be changed. Return only a JSON array of file paths.`;

    try {
      const response = await generateSummary(userPrompt, systemPrompt, {
        thinkingLevel: 'pro',
        maxTokens: 10000,
        temperature: 0.3,
      });

      // Parse JSON array from response
      let jsonText = response.trim();
      const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonText = jsonMatch[1];
      }

      const files = JSON.parse(jsonText);
      if (Array.isArray(files)) {
        // Filter to only include files that exist and are in src/
        const validFiles: string[] = [];
        for (const file of files) {
          if (typeof file === 'string' && file.startsWith('src/')) {
            const fullPath = path.join(this.repoPath, file);
            try {
              await fs.access(fullPath);
              validFiles.push(file);
            } catch {
              // File doesn't exist, skip it
            }
          }
        }
        return validFiles;
      }
      return [];
    } catch (error) {
      console.error('[AutoFix] Failed to identify affected files:', error);
      return [];
    }
  }

  /**
   * Apply a fix to a specific file using AI
   */
  private async applyFixToFile(
    filePath: string,
    fileContent: string,
    prophecy: Prophecy,
    projectMemory: string
  ): Promise<string> {
    const systemPrompt = `You are an expert refactoring engine. Apply the following fix to the provided code to align it with the Project Soul. Return the full updated file content. No conversation, no explanations, just the complete corrected file.`;

    const userPrompt = `Project Memory (Context):
${projectMemory}

Prophecy:
Title: ${prophecy.title}
Type: ${prophecy.type}
Description: ${prophecy.description}
Suggested Action: ${prophecy.suggestedAction}

File to fix: ${filePath}

Current file content:
\`\`\`
${fileContent}
\`\`\`

Apply the suggested fix to this file. Return the complete updated file content with all changes applied. Do not add comments explaining the changes.`;

    try {
      const response = await generateSummary(userPrompt, systemPrompt, {
        thinkingLevel: 'pro',
        maxTokens: 10000,
        temperature: 0.2,
      });

      // Extract code from markdown code blocks if present
      let code = response.trim();
      const codeMatch = code.match(/```(?:\w+)?\s*([\s\S]*?)\s*```/);
      if (codeMatch) {
        code = codeMatch[1];
      }

      return code;
    } catch (error: any) {
      throw new Error(`Failed to apply fix to ${filePath}: ${error.message}`);
    }
  }

  /**
   * Read PROJECT_MEMORY.md for context
   */
  private async readProjectMemory(): Promise<string> {
    const memoryPath = path.join(this.repoPath, 'PROJECT_MEMORY.md');
    try {
      return await fs.readFile(memoryPath, 'utf-8');
    } catch (error) {
      return '';
    }
  }
}

