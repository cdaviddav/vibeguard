import * as fs from 'fs/promises';
import * as path from 'path';
import writeFileAtomic from 'write-file-atomic';
import { GitUtils } from '../utils/git';
import { generateSummary } from '../utils/llm';

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
   * Write memory file atomically
   */
  async writeMemory(content: string): Promise<void> {
    // Validate structure
    if (!this.validateMemoryStructure(content)) {
      throw new Error('Invalid PROJECT_MEMORY.md structure: missing required sections');
    }

    // Write atomically
    const memoryPath = this.getMemoryPath();
    await writeFileAtomic(memoryPath, content, 'utf-8');

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
   * Append content to a specific section in PROJECT_MEMORY.md
   * If the section exists, appends the content under that header.
   * If not, appends to the end of the file.
   * Uses atomic writes for safety.
   */
  async appendToSection(section: string, content: string): Promise<void> {
    // Normalize section name to match markdown header format (## Section Name)
    let sectionHeader = section.trim();
    if (!sectionHeader.startsWith('##')) {
      sectionHeader = `## ${sectionHeader}`;
    }

    // Read current memory
    let currentContent = await this.readMemory();
    
    // If file is empty, create basic structure
    if (!currentContent || currentContent.trim().length === 0) {
      currentContent = `# PROJECT_MEMORY.md\n\n${sectionHeader}\n\n`;
    }

    const lines = currentContent.split('\n');
    const updatedLines: string[] = [];
    let sectionFound = false;
    let sectionIndex = -1;

    // Find the section header (handle variations like "## Recent Decisions (The "Why")")
    const normalizedSectionHeader = sectionHeader.replace(/^##\s+/, ''); // Remove ## prefix for comparison
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      // Match exact header or header with additional text in parentheses
      if (line === sectionHeader || 
          (line.startsWith('## ') && line.replace(/^##\s+/, '').split('(')[0].trim() === normalizedSectionHeader)) {
        sectionFound = true;
        sectionIndex = i;
        break;
      }
    }

    if (sectionFound && sectionIndex >= 0) {
      // Section exists - append content after the header
      for (let i = 0; i <= sectionIndex; i++) {
        updatedLines.push(lines[i]);
      }

      // Find the end of the section (next ## header or end of file)
      let insertIndex = sectionIndex + 1;
      
      // Skip blank lines after header
      while (insertIndex < lines.length && lines[insertIndex].trim() === '') {
        updatedLines.push(lines[insertIndex]);
        insertIndex++;
      }

      // Add the new content with proper formatting
      const formattedContent = content.trim();
      if (formattedContent) {
        updatedLines.push(formattedContent);
        updatedLines.push(''); // Add blank line after content
      }

      // Add remaining lines
      for (let i = insertIndex; i < lines.length; i++) {
        updatedLines.push(lines[i]);
      }
    } else {
      // Section doesn't exist - append to end
      updatedLines.push(...lines);
      if (lines[lines.length - 1] !== '') {
        updatedLines.push(''); // Ensure blank line before new section
      }
      updatedLines.push(sectionHeader);
      updatedLines.push(''); // Blank line after header
      updatedLines.push(content.trim());
    }

    const updatedContent = updatedLines.join('\n');

    // Write atomically
    const memoryPath = this.getMemoryPath();
    await writeFileAtomic(memoryPath, updatedContent, 'utf-8');
    
    // Auto-stage the file
    await this.stageMemoryFile();
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
4. Preserve all Recent Decisions entries; do not delete older entries during merge
5. Return the complete, merged Markdown file with no conflict markers

# CONFLICTED FILE
${conflictedContent}

# OUTPUT
Return only the merged Markdown content, no explanations.`;

    const systemPrompt = `You are a Git conflict resolution expert specializing in Markdown files about software architecture.`;

    try {
      const merged = await generateSummary(conflictPrompt, systemPrompt, {
        thinkingLevel: 'flash',
        temperature: 0.2, // Lower temperature for more consistent merging
        feature: 'Librarian',
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

