import * as fs from 'fs/promises';
import * as path from 'path';
import { generateSummary } from '../utils/llm';

export interface Prophecy {
  id: string;
  type: 'Refactor' | 'RuleViolation' | 'Optimization';
  title: string;
  description: string;
  suggestedAction: string;
  priority: 'High' | 'Medium' | 'Low';
  createdAt: string;
}

interface OracleState {
  prophecies: Prophecy[];
  lastSeekTime: string | null;
}

export class OracleService {
  private repoPath: string;
  private statePath: string;

  constructor(repoPath: string = process.cwd()) {
    this.repoPath = repoPath;
    this.statePath = path.join(repoPath, '.vibeguard', 'oracle.json');
  }

  /**
   * Load oracle state from file
   */
  private async loadState(): Promise<OracleState> {
    try {
      const content = await fs.readFile(this.statePath, 'utf-8');
      return JSON.parse(content) as OracleState;
    } catch (error) {
      // State file doesn't exist - return default
      return {
        prophecies: [],
        lastSeekTime: null,
      };
    }
  }

  /**
   * Save oracle state to file
   */
  private async saveState(state: OracleState): Promise<void> {
    // Ensure .vibeguard directory exists
    const stateDir = path.dirname(this.statePath);
    await fs.mkdir(stateDir, { recursive: true });

    await fs.writeFile(this.statePath, JSON.stringify(state, null, 2), 'utf-8');
  }

  /**
   * Scan the project directory and return file tree structure
   */
  private async scanProjectTree(): Promise<string> {
    const files: string[] = [];
    const repoPath = this.repoPath;

    async function walkDir(dir: string, prefix: string = '', depth: number = 0): Promise<void> {
      if (depth > 15) return; // Limit depth to prevent excessive scanning

      try {
        const entries = await fs.readdir(dir, { withFileTypes: true });

        const filtered = entries.filter(entry => {
          const name = entry.name;
          // Filter out common ignore patterns
          return (
            !name.startsWith('.') ||
            name === '.git' ||
            name === '.env' ||
            name === '.cursor'
          ) &&
          name !== 'node_modules' &&
          name !== 'dist' &&
          name !== 'build' &&
          name !== '.vibeguard'; // Don't scan oracle state itself
        });

        for (let i = 0; i < filtered.length; i++) {
          const entry = filtered[i];
          const isLast = i === filtered.length - 1;
          const currentPrefix = isLast ? '└── ' : '├── ';
          const nextPrefix = isLast ? '    ' : '│   ';

          files.push(prefix + currentPrefix + entry.name + (entry.isDirectory() ? '/' : ''));

          if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
            const fullPath = path.join(dir, entry.name);
            await walkDir(fullPath, prefix + nextPrefix, depth + 1);
          }
        }
      } catch (error) {
        // Ignore permission errors or inaccessible directories
      }
    }

    try {
      await walkDir(repoPath);
    } catch (error) {
      throw new Error(`Failed to scan project tree: ${error}`);
    }

    return files.join('\n');
  }

  /**
   * Read PROJECT_MEMORY.md
   */
  private async readProjectMemory(): Promise<string> {
    const memoryPath = path.join(this.repoPath, 'PROJECT_MEMORY.md');
    try {
      return await fs.readFile(memoryPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read PROJECT_MEMORY.md: ${error}`);
    }
  }

  /**
   * Read DIAGRAM.md
   */
  private async readDiagram(): Promise<string> {
    const diagramPath = path.join(this.repoPath, 'DIAGRAM.md');
    try {
      return await fs.readFile(diagramPath, 'utf-8');
    } catch (error) {
      throw new Error(`Failed to read DIAGRAM.md: ${error}`);
    }
  }

  /**
   * Seek prophecy - Compare Project Soul/Rules with actual file structure
   */
  async seekProphecy(): Promise<Prophecy[]> {
    console.log('[Oracle] Seeking prophecy...');

    try {
      // Gather context
      const [projectMemory, diagram, fileTree] = await Promise.all([
        this.readProjectMemory(),
        this.readDiagram(),
        this.scanProjectTree(),
      ]);

      // Build the reasoning prompt
      const systemPrompt = `You are an architectural oracle analyzing a codebase for "Architectural Drift" - places where the code has diverged from the intended architecture and rules defined in PROJECT_MEMORY.md.

Your task is to identify 3 specific areas where the code is 'drifting' from the intended architecture. Look for:
- Violated Core Rules (e.g., using barrel imports when forbidden, not following atomic updates, etc.)
- Undocumented Tech Stack additions (new libraries/dependencies not mentioned in Tech Stack)
- Structural deviations from DIAGRAM.md (new components/services not reflected in architecture)
- Anti-patterns that contradict the Project Soul

Output your findings as a JSON array with exactly 3 objects. Each object must have:
- id: A unique identifier (e.g., "prophecy-001")
- type: One of "Refactor", "RuleViolation", or "Optimization"
- title: A concise title (max 60 characters)
- description: Detailed description of the drift (2-4 sentences)
- suggestedAction: Specific, actionable recommendation (1-2 sentences)
- priority: "High", "Medium", or "Low" based on severity

Format your response as a valid JSON array only. No markdown, no code blocks, just the JSON array.`;

      const userPrompt = `PROJECT_MEMORY.md:
${projectMemory}

DIAGRAM.md:
${diagram}

Current File Tree:
${fileTree}

Analyze the above and identify 3 specific areas of architectural drift. Return a JSON array of prophecies.`;

      // Use Gemini 3 Pro for architectural reasoning
      const response = await generateSummary(userPrompt, systemPrompt, {
        thinkingLevel: 'pro',
        maxTokens: 50000,
        temperature: 0.5,
      });

      // Parse the JSON response
      let prophecies: Prophecy[] = [];
      
      try {
        // Try to extract JSON from markdown code blocks if present
        let jsonText = response.trim();
        const jsonMatch = jsonText.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
        if (jsonMatch) {
          jsonText = jsonMatch[1];
        }
        
        // Parse the JSON array
        const parsed = JSON.parse(jsonText);
        prophecies = Array.isArray(parsed) ? parsed : [parsed];
        
        // Validate and add timestamps
        prophecies = prophecies.map((p: any) => ({
          id: p.id || `prophecy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          type: p.type || 'Optimization',
          title: p.title || 'Untitled Prophecy',
          description: p.description || '',
          suggestedAction: p.suggestedAction || '',
          priority: p.priority || 'Medium',
          createdAt: p.createdAt || new Date().toISOString(),
        })).slice(0, 3); // Ensure max 3 prophecies
      } catch (parseError) {
        console.error('[Oracle] Failed to parse prophecy response:', parseError);
        console.error('[Oracle] Response was:', response);
        
        // Fallback: Create a single prophecy about parsing failure
        prophecies = [{
          id: `prophecy-error-${Date.now()}`,
          type: 'Optimization',
          title: 'Oracle Response Parsing Failed',
          description: `The oracle response could not be parsed. This may indicate an issue with the LLM response format. Response preview: ${response.substring(0, 200)}...`,
          suggestedAction: 'Review the oracle.ts implementation and ensure proper JSON response handling.',
          priority: 'Low',
          createdAt: new Date().toISOString(),
        }];
      }

      // Load existing state and merge prophecies
      const state = await this.loadState();
      
      // Remove duplicates based on id
      const existingIds = new Set(state.prophecies.map(p => p.id));
      const newProphecies = prophecies.filter(p => !existingIds.has(p.id));
      
      // Merge: keep existing + add new (limit to 20 total)
      const allProphecies = [...state.prophecies, ...newProphecies].slice(-20);
      
      // Update state
      await this.saveState({
        prophecies: allProphecies,
        lastSeekTime: new Date().toISOString(),
      });

      console.log(`[Oracle] Generated ${newProphecies.length} new prophecies`);
      return prophecies;
    } catch (error) {
      console.error('[Oracle] Error seeking prophecy:', error);
      throw error;
    }
  }

  /**
   * Get all prophecies
   */
  async getProphecies(): Promise<Prophecy[]> {
    const state = await this.loadState();
    return state.prophecies;
  }

  /**
   * Get prophecies by priority
   */
  async getPropheciesByPriority(priority: 'High' | 'Medium' | 'Low'): Promise<Prophecy[]> {
    const prophecies = await this.getProphecies();
    return prophecies.filter(p => p.priority === priority);
  }

  /**
   * Clear all prophecies
   */
  async clearProphecies(): Promise<void> {
    await this.saveState({
      prophecies: [],
      lastSeekTime: null,
    });
  }
}

