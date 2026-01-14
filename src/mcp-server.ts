#!/usr/bin/env node

/**
 * VibeGuard MCP Server
 * 
 * Exposes PROJECT_MEMORY.md as an MCP tool for Cursor to access project context.
 * This allows Cursor to refresh its knowledge of the project's architecture,
 * tech stack, and recent decisions.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { ListToolsRequestSchema, CallToolRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import { MemoryManager } from './librarian/memory-manager';
import * as fs from 'fs/promises';
import * as path from 'path';

// Create server instance
const server = new Server(
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

// Register the read_project_memory tool
server.setRequestHandler(ListToolsRequestSchema, async () => {
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

// Handle tool execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
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

      // Read pinned files and build output
      const outputParts: string[] = ['# Pinned Project Context', ''];
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

