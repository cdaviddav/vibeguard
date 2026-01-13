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
          "Updates the PROJECT_MEMORY.md file with new content. Validates required sections and uses atomic writes for safety.",
        inputSchema: {
          type: 'object',
          properties: {
            content: {
              type: 'string',
              description: 'The complete content of PROJECT_MEMORY.md to write. Must include all required sections: Project Soul, Tech Stack, Architecture, Core Rules, Recent Decisions, and Active Tech Debt.',
            },
          },
          required: ['content'],
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
      // Extract content parameter
      const content = args?.content;
      
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

      // Use MemoryManager.writeMemory() which handles:
      // - Atomic writes via write-file-atomic
      // - Validation of required sections
      // - Compression if needed
      // - Auto-staging in Git
      await memoryManager.writeMemory(content);

      return {
        content: [
          {
            type: 'text',
            text: 'Project Memory updated successfully.',
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

  throw new Error(`Unknown tool: ${name}`);
});

// Start the server
async function main() {
  const transport = new StdioServerTransport();
  
  // Connect the server to the transport
  await server.connect(transport);
  
  // Log to stderr (stdout is used for MCP protocol)
  console.error('VibeGuard MCP Server started');
  console.error('Tools available: read_project_memory, update_project_memory');
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

