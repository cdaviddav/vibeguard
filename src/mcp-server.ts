#!/usr/bin/env node

/**
 * VibeGuard MCP Server
 * 
 * Exposes PROJECT_MEMORY.md as an MCP tool for Cursor to access project context.
 * This allows Cursor to refresh its knowledge of the project's architecture,
 * tech stack, and recent decisions.
 */

// Use explicit .js extensions for ESM compatibility
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
// Types are often exported from the root or specific files, check if types.js exists or use root
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import { MemoryManager } from './librarian/memory-manager.js';
import { generateSummary } from './utils/llm.js';
import { getApiKey } from './utils/config.js';
import * as fs from 'fs/promises';
import * as path from 'path';

// Create server instance
const server = new McpServer(
  {
    name: 'vibeguard-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// Initialize memory manager
const repoPath = process.cwd();
const memoryManager = new MemoryManager(repoPath);

/**
 * Recursively find the latest modified time of any file in a directory
 */
async function getLatestMTime(dir: string): Promise<Date | null> {
  let latestMTime: Date | null = null;

  async function walkDir(currentDir: string, depth: number = 0): Promise<void> {
    if (depth > 10) return; // Limit depth to prevent infinite loops

    try {
      const entries = await fs.readdir(currentDir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(currentDir, entry.name);

        // Skip common ignore patterns
        if (
          entry.name.startsWith('.') ||
          entry.name === 'node_modules' ||
          entry.name === 'dist' ||
          entry.name === 'build'
        ) {
          continue;
        }

        if (entry.isDirectory()) {
          await walkDir(fullPath, depth + 1);
        } else if (entry.isFile()) {
          try {
            const stats = await fs.stat(fullPath);
            if (!latestMTime || stats.mtime > latestMTime) {
              latestMTime = stats.mtime;
            }
          } catch (error) {
            // Ignore permission errors or missing files
          }
        }
      }
    } catch (error) {
      // Ignore permission errors
    }
  }

  try {
    await fs.access(dir);
    await walkDir(dir);
  } catch (error) {
    return null;
  }

  return latestMTime;
}

/**
 * Scan src/ directory and return file structure (for visualization)
 */
async function scanSrcDirectory(): Promise<string> {
  const srcPath = path.join(repoPath, 'src');
  const files: string[] = [];

  async function walkDir(dir: string, prefix: string = '', depth: number = 0): Promise<void> {
    if (depth > 10) return;

    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      const filtered = entries.filter(entry => {
        const name = entry.name;
        return (
          !name.startsWith('.') &&
          name !== 'node_modules' &&
          name !== 'dist' &&
          name !== 'build'
        );
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

  const mermaidMatch = mermaidCode.match(/```mermaid\n([\s\S]*?)```/);
  if (!mermaidMatch) {
    errors.push('No mermaid code block found');
    return { valid: false, errors };
  }

  const code = mermaidMatch[1];

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

  const subgraphOpen = (code.match(/subgraph\s+[^\s]+\s*\[/g) || []).length;
  const subgraphClose = (code.match(/end\s*$/gm) || []).length;
  if (subgraphOpen !== subgraphClose) {
    errors.push(`Unbalanced subgraphs: ${subgraphOpen} opened, ${subgraphClose} closed`);
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Generate architecture diagram programmatically
 */
async function generateDiagram(): Promise<void> {
  try {
    // Validate API key is available
    await getApiKey();
  } catch (error: any) {
    console.error('Cannot generate diagram: API key not available');
    return;
  }

  const srcPath = path.join(repoPath, 'src');

  try {
    await fs.access(srcPath);
  } catch (error) {
    console.error('Cannot generate diagram: src/ directory not found');
    return;
  }

  // Scan src/ directory
  const fileStructure = await scanSrcDirectory();

  // Read PROJECT_MEMORY.md for context
  let projectMemory = '';
  try {
    projectMemory = await memoryManager.readMemory();
  } catch (error) {
    // Continue without context
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

  try {
    const diagramContent = await generateSummary(prompt, systemPrompt, {
      thinkingLevel: 'pro',
      maxTokens: 10000,
      feature: 'Librarian',
    });

    // Validate Mermaid syntax
    const validation = validateMermaidSyntax(diagramContent);

    let finalContent = diagramContent;
    if (!validation.valid) {
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
      if (fixedValidation.valid) {
        finalContent = fixedContent;
      }
    }

    // Save the diagram
    const diagramPath = path.join(repoPath, 'DIAGRAM.md');
    await fs.writeFile(diagramPath, finalContent, 'utf-8');
  } catch (error: any) {
    console.error('Error generating diagram:', error.message || error);
  }
}

/**
 * Parse entries from the Recent Decisions section
 * Returns an array of entry strings (each entry may span multiple lines)
 */
function parseRecentDecisionsEntries(memoryContent: string): string[] {
  const lines = memoryContent.split('\n');
  const entries: string[] = [];
  let inRecentDecisions = false;
  let currentEntry: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if we've found the Recent Decisions section
    if (trimmedLine.match(/^##\s+Recent\s+Decisions/i)) {
      inRecentDecisions = true;
      continue;
    }

    // If we're in the section and hit another ## header, we're done
    if (inRecentDecisions && trimmedLine.match(/^##\s+/)) {
      // Save last entry if exists
      if (currentEntry.length > 0) {
        entries.push(currentEntry.join('\n').trim());
      }
      break;
    }

    // If we're in the section, collect entries
    if (inRecentDecisions) {
      // Detect entry start: lines starting with "- **" or "**" (bullet point format)
      const isEntryStart = /^\s*[-*]\s+\*\*/.test(line) || /^\s*\*\*/.test(line);
      
      if (isEntryStart) {
        // Save previous entry if exists
        if (currentEntry.length > 0) {
          entries.push(currentEntry.join('\n').trim());
        }
        // Start new entry
        currentEntry = [line];
      } else if (currentEntry.length > 0 || trimmedLine.length > 0) {
        // Continue current entry (or start if first non-empty line after header)
        if (trimmedLine.length > 0 || currentEntry.length > 0) {
          currentEntry.push(line);
        }
      }
    }
  }

  // Save last entry if exists
  if (inRecentDecisions && currentEntry.length > 0) {
    entries.push(currentEntry.join('\n').trim());
  }

  return entries;
}

/**
 * Remove the oldest N entries from Recent Decisions section
 * Returns the modified content
 */
function removeOldestDecisions(memoryContent: string, countToRemove: number): string {
  const lines = memoryContent.split('\n');
  const result: string[] = [];
  let inRecentDecisions = false;
  let entryCount = 0;
  let skipCount = 0;
  let currentEntry: string[] = [];
  let shouldSkipCurrentEntry = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if we've found the Recent Decisions section
    if (trimmedLine.match(/^##\s+Recent\s+Decisions/i)) {
      inRecentDecisions = true;
      result.push(line);
      continue;
    }

    // If we're in the section and hit another ## header, we're done
    if (inRecentDecisions && trimmedLine.match(/^##\s+/)) {
      // Don't add skipped entry
      result.push(line);
      inRecentDecisions = false;
      continue;
    }

    // If we're in the section, process entries
    if (inRecentDecisions) {
      const isEntryStart = /^\s*[-*]\s+\*\*/.test(line) || /^\s*\*\*/.test(line);
      
      if (isEntryStart) {
        // Process previous entry
        if (currentEntry.length > 0) {
          if (!shouldSkipCurrentEntry) {
            result.push(...currentEntry);
          }
          currentEntry = [];
        }

        // Determine if we should skip this entry
        entryCount++;
        shouldSkipCurrentEntry = skipCount < countToRemove;
        
        if (shouldSkipCurrentEntry) {
          skipCount++;
        } else {
          currentEntry.push(line);
        }
      } else {
        // Continue current entry
        if (!shouldSkipCurrentEntry) {
          currentEntry.push(line);
        }
      }
    } else {
      // Not in Recent Decisions section, copy line as-is
      result.push(line);
    }
  }

  // Handle last entry if exists
  if (inRecentDecisions && currentEntry.length > 0 && !shouldSkipCurrentEntry) {
    result.push(...currentEntry);
  }

  return result.join('\n');
}

/**
 * Perform memory compaction: summarize oldest 10 entries and move to Legacy Context
 */
async function performMemoryCompaction(memoryContent: string): Promise<string> {
  // Extract all Recent Decisions entries
  const entries = parseRecentDecisionsEntries(memoryContent);
  
  if (entries.length <= 10) {
    return memoryContent; // Not enough entries to compact
  }

  // Get oldest 10 entries
  const oldestEntries = entries.slice(0, 10);
  const entriesText = oldestEntries.join('\n\n');

  // Summarize using Gemini
  const today = new Date().toLocaleDateString();
  const summaryPrompt = `Summarize these 10 technical decisions into 3 concise bullet points for a section called 'Legacy Context'. Each bullet should capture the essential architectural or design decision, not individual file changes.

Decisions to summarize:
${entriesText}

Requirements:
- Output exactly 3 bullet points
- Each bullet should start with "- "
- Focus on architectural intent and "why" decisions were made
- Keep each bullet concise (1-2 sentences max)
- Use today's date (${today}) for any date references

Output only the 3 bullet points, no additional text.`;

  const systemPrompt = `You are an expert at summarizing technical decisions. You create concise, high-density summaries that preserve architectural intent.`;

  try {
    const summary = await generateSummary(summaryPrompt, systemPrompt, {
      thinkingLevel: 'pro',
      maxTokens: 10000,
      feature: 'Librarian',
    });

    // Extract bullet points from summary (clean up any markdown formatting)
    let legacyBullets = summary.trim();
    
    // Ensure each line starts with "- " and is a bullet point
    const bulletLines = legacyBullets
      .split('\n')
      .map(line => line.trim())
      .filter(line => line.length > 0)
      .map(line => {
        // If line doesn't start with "- ", add it
        if (!line.startsWith('- ')) {
          // Remove any existing markdown list markers
          line = line.replace(/^[-*]\s*/, '');
          return `- ${line}`;
        }
        return line;
      });

    // Ensure we have exactly 3 bullets (take first 3 if more)
    const finalBullets = bulletLines.slice(0, 3).join('\n');

    // Remove oldest 10 entries from Recent Decisions
    let updatedContent = removeOldestDecisions(memoryContent, 10);

    // Append to Legacy Context section (or create it)
    // Check if Legacy Context section exists
    const hasLegacySection = /^##\s+Legacy\s+Context/i.test(updatedContent);
    
    if (hasLegacySection) {
      // First, write the content with removed entries
      await memoryManager.writeMemory(updatedContent);
      // Then append to existing Legacy Context section
      await memoryManager.appendToSection('Legacy Context', finalBullets);
      // Re-read to get final updated content
      updatedContent = await memoryManager.readMemory();
    } else {
      // Create new Legacy Context section
      const lines = updatedContent.split('\n');
      // Find a good place to insert (after Active Tech Debt or at the end)
      let insertIndex = lines.length;
      
      // Look for Active Tech Debt section
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].match(/^##\s+Active\s+Tech\s+Debt/i)) {
          // Find the end of this section
          for (let j = i + 1; j < lines.length; j++) {
            if (lines[j].match(/^##\s+/)) {
              insertIndex = j;
              break;
            }
          }
          break;
        }
      }

      // Insert Legacy Context section
      const beforeSection = lines.slice(0, insertIndex).join('\n');
      const afterSection = lines.slice(insertIndex).join('\n');
      
      updatedContent = beforeSection + 
        (beforeSection.endsWith('\n') ? '' : '\n') +
        '\n## Legacy Context\n\n' +
        finalBullets + '\n' +
        (afterSection.startsWith('\n') ? '' : '\n') +
        afterSection;

      // Write the updated content (with removed entries and new Legacy Context section)
      await memoryManager.writeMemory(updatedContent);
      updatedContent = await memoryManager.readMemory();
    }

    return updatedContent;
  } catch (error: any) {
    // If summarization fails, log error but don't fail the update
    console.error('Librarian: Error during memory compaction:', error.message || error);
    return memoryContent; // Return original content if compaction fails
  }
}

/**
 * Parse the Pinned Files section from PROJECT_MEMORY.md
 * Returns an array of file paths, or null if section doesn't exist
 */
function parsePinnedFiles(memoryContent: string): string[] | null {
  const lines = memoryContent.split('\n');
  let inPinnedSection = false;
  const filePaths: string[] = [];

  for (const line of lines) {
    const trimmedLine = line.trim();
    
    // Check if we've found the Pinned Files section
    if (trimmedLine === '## Pinned Files') {
      inPinnedSection = true;
      continue;
    }

    // If we're in the section and hit another ## header, we're done
    if (inPinnedSection && trimmedLine.startsWith('## ')) {
      break;
    }

    // If we're in the section, collect non-empty lines as file paths
    if (inPinnedSection) {
      // Skip empty lines
      if (trimmedLine.length === 0) {
        continue;
      }
      // Extract path (remove list markers if present)
      const filePath = trimmedLine.replace(/^[-*]\s+/, '').trim();
      if (filePath.length > 0) {
        filePaths.push(filePath);
      }
    }
  }

  return inPinnedSection ? filePaths : null;
}

// Register the read_project_memory tool using the underlying Server instance
server.server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: [
      {
        name: 'read_project_memory',
        description:
          "Reads the current PROJECT_MEMORY.md file to refresh knowledge of the project's architecture, tech stack, and recent decisions. Returns the complete content of the memory file.",
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
      {
        name: 'update_project_memory',
        description:
          "Updates the PROJECT_MEMORY.md file by appending content to a specific section. If the section exists, appends the new content under that header. If not, appends it to the end of the file. Uses atomic writes for safety.",
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The text content to add to the section.',
            },
            section: {
              type: 'string',
              description: 'The section name where to add the content (e.g., "Recent Decisions", "Active Tech Debt"). Will match section headers like "## Recent Decisions".',
            },
          },
          required: ['content', 'section'],
        },
      },
      {
        name: 'get_core_context',
        description:
          "Reads pinned files from PROJECT_MEMORY.md's '## Pinned Files' section and returns their contents in a structured Markdown format. If the section doesn't exist, it will be created with default files (PROJECT_MEMORY.md and package.json).",
        inputSchema: {
          type: 'object',
          properties: {},
          required: [],
        },
      },
    ],
  };
});

// Handle tool execution using the underlying Server instance
// Add explicit type to silence TS7006
server.server.setRequestHandler(CallToolRequestSchema, async (request: any) => {
  const { name, arguments: args } = request.params;

  if (name === 'read_project_memory') {
    try {
      // Read the PROJECT_MEMORY.md file
      const memoryContent = await memoryManager.readMemory();

      if (!memoryContent || memoryContent.trim().length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'PROJECT_MEMORY.md is empty or does not exist. Run `vibeguard init` to create it.',
            },
          ],
        };
      }

      return {
        content: [
          {
            type: 'text',
            text: memoryContent,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error reading PROJECT_MEMORY.md: ${error.message || error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'update_project_memory') {
    try {
      // Extract content and section parameters
      const content = args?.content;
      const section = args?.section;
      
      if (!content || typeof content !== 'string') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: content parameter is required and must be a string.',
            },
          ],
          isError: true,
        };
      }

      if (!section || typeof section !== 'string') {
        return {
          content: [
            {
              type: 'text',
              text: 'Error: section parameter is required and must be a string.',
            },
          ],
          isError: true,
        };
      }

      // Memory Compaction Check: If updating "Recent Decisions", check if compaction is needed
      const normalizedSection = section.trim().toLowerCase();
      if (normalizedSection === 'recent decisions' || normalizedSection === 'recent decisions (the "why")') {
        // Read current memory to check entry count
        const currentMemory = await memoryManager.readMemory();
        const entries = parseRecentDecisionsEntries(currentMemory);
        
        // If we have more than 15 entries, trigger compaction
        if (entries.length > 15) {
          console.error('Librarian: Compacting 10 old decisions into Legacy Context to save tokens.');
          await performMemoryCompaction(currentMemory);
        }
      }

      // Use MemoryManager.appendToSection() which handles:
      // - Finding the section or appending to end
      // - Atomic writes via write-file-atomic
      // - Compression if needed
      // - Auto-staging in Git
      await memoryManager.appendToSection(section, content);

      return {
        content: [
          {
            type: 'text',
            text: `Project Memory updated successfully. Content appended to section: ${section}`,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error updating PROJECT_MEMORY.md: ${error.message || error}`,
          },
        ],
        isError: true,
      };
    }
  }

  if (name === 'get_core_context') {
    try {
      // Staleness Check: Compare src/ mtime with DIAGRAM.md mtime
      const srcPath = path.join(repoPath, 'src');
      const diagramPath = path.join(repoPath, 'DIAGRAM.md');
      
      let isStale = false;
      let stalenessWarning = '';

      try {
        // Get latest mtime from src/ directory
        const srcLatestMTime = await getLatestMTime(srcPath);
        
        // Get mtime of DIAGRAM.md if it exists
        let diagramMTime: Date | null = null;
        try {
          const diagramStats = await fs.stat(diagramPath);
          diagramMTime = diagramStats.mtime;
        } catch (error) {
          // DIAGRAM.md doesn't exist - consider it stale
          if (srcLatestMTime) {
            isStale = true;
            stalenessWarning = 'CONTEXT_STALE: The architecture diagram is out of date.';
          }
        }

        // Compare timestamps if both exist
        if (srcLatestMTime && diagramMTime && srcLatestMTime > diagramMTime) {
          isStale = true;
          stalenessWarning = 'CONTEXT_STALE: The architecture diagram is out of date.';
        }

        // If stale, trigger visualization automatically
        if (isStale) {
          console.error('Context is stale. Regenerating DIAGRAM.md...');
          await generateDiagram();
          // Re-check after generation
          try {
            const newDiagramStats = await fs.stat(diagramPath);
            const newSrcMTime = await getLatestMTime(srcPath);
            if (newSrcMTime && newSrcMTime > newDiagramStats.mtime) {
              // Still stale after generation (files changed during generation)
              stalenessWarning = 'CONTEXT_STALE: The architecture diagram is out of date.';
            } else {
              // Successfully updated
              stalenessWarning = '';
            }
          } catch (error) {
            // Diagram generation may have failed, keep warning
          }
        }
      } catch (error) {
        // If we can't check staleness, continue without warning
        console.error('Error checking staleness:', error);
      }

      // Read PROJECT_MEMORY.md
      let memoryContent = await memoryManager.readMemory();

      if (!memoryContent || memoryContent.trim().length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: 'PROJECT_MEMORY.md is empty or does not exist. Run `vibeguard init` to create it.',
            },
          ],
          isError: true,
        };
      }

      // Parse pinned files section
      let filePaths = parsePinnedFiles(memoryContent);

      // If section doesn't exist, create it with defaults
      if (filePaths === null) {
        const defaultFiles = 'PROJECT_MEMORY.md\npackage.json';
        await memoryManager.appendToSection('Pinned Files', defaultFiles);
        // Re-read memory to get updated content
        memoryContent = await memoryManager.readMemory();
        filePaths = parsePinnedFiles(memoryContent);
        
        // If still null after creation, use defaults directly
        if (filePaths === null) {
          filePaths = ['PROJECT_MEMORY.md', 'package.json'];
        }
      }

      // If no files found, use defaults
      if (filePaths.length === 0) {
        filePaths = ['PROJECT_MEMORY.md', 'package.json'];
      }

      // Check if DIAGRAM.md exists and prepend it
      let diagramContent = '';
      try {
        diagramContent = await fs.readFile(diagramPath, 'utf-8');
      } catch (error) {
        // DIAGRAM.md doesn't exist - that's fine, continue without it
      }

      // Read pinned files and build output
      const outputParts: string[] = ['# Pinned Project Context', ''];
      
      // Add staleness warning if present
      if (stalenessWarning) {
        outputParts.push(`**⚠️ ${stalenessWarning}**`, '');
        outputParts.push('');
      }
      
      // Prepend DIAGRAM.md if it exists
      if (diagramContent && diagramContent.trim().length > 0) {
        outputParts.push('## Architecture Diagram', '');
        outputParts.push(diagramContent);
        outputParts.push('');
        outputParts.push('---');
        outputParts.push('');
      }
      
      const errors: string[] = [];

      for (const filePath of filePaths) {
        try {
          const fullPath = path.join(repoPath, filePath);
          const fileContent = await fs.readFile(fullPath, 'utf-8');
          
          outputParts.push(`## File: ${filePath}`);
          outputParts.push('');
          outputParts.push(fileContent);
          outputParts.push('');
        } catch (error: any) {
          // Handle file not found gracefully
          if (error.code === 'ENOENT') {
            errors.push(`File not found: ${filePath}`);
            // Still add the section but with a note
            outputParts.push(`## File: ${filePath}`);
            outputParts.push('');
            outputParts.push(`*File not found: ${filePath}*`);
            outputParts.push('');
          } else {
            errors.push(`Error reading ${filePath}: ${error.message || error}`);
          }
        }
      }

      // Add errors at the end if any
      if (errors.length > 0) {
        outputParts.push('---');
        outputParts.push('');
        outputParts.push('## Errors');
        outputParts.push('');
        for (const error of errors) {
          outputParts.push(`- ${error}`);
        }
      }

      const output = outputParts.join('\n');

      return {
        content: [
          {
            type: 'text',
            text: output,
          },
        ],
      };
    } catch (error: any) {
      return {
        content: [
          {
            type: 'text',
            text: `Error getting core context: ${error.message || error}`,
          },
        ],
        isError: true,
      };
    }
  }

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
  
  // Log to stderr (stdout is used for MCP protocol)
  console.error('VibeGuard MCP Server started');
  console.error('Tools available: read_project_memory, update_project_memory, get_core_context');
  console.error('Waiting for MCP client connections...');
}

// Handle errors
process.on('SIGINT', async () => {
  console.error('\nShutting down MCP server...');
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.error('\nShutting down MCP server...');
  process.exit(0);
});

// Start the server
main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});

