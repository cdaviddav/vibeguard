import { estimateTokens } from './llm';

/**
 * Group files from a diff by directory/module
 */
function groupFilesByDirectory(diff: string): Map<string, string[]> {
  const fileGroups = new Map<string, string[]>();
  const lines = diff.split('\n');
  let currentFile = '';
  let currentGroup = 'root';

  for (const line of lines) {
    // Detect file header
    if (line.startsWith('diff --git')) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        currentFile = match[2];
        // Extract directory (first 2 levels)
        const parts = currentFile.split('/');
        if (parts.length > 1) {
          currentGroup = parts.slice(0, Math.min(2, parts.length - 1)).join('/');
        } else {
          currentGroup = 'root';
        }

        if (!fileGroups.has(currentGroup)) {
          fileGroups.set(currentGroup, []);
        }
        fileGroups.get(currentGroup)!.push(currentFile);
      }
    }
  }

  return fileGroups;
}

/**
 * Extract diff for a specific file
 */
function extractFileDiff(diff: string, filePath: string): string {
  const lines = diff.split('\n');
  const result: string[] = [];
  let inTargetFile = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('diff --git')) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match && match[2] === filePath) {
        inTargetFile = true;
        result.push(line);
      } else {
        inTargetFile = false;
      }
      continue;
    }

    if (inTargetFile) {
      // Stop at next file
      if (line.startsWith('diff --git')) {
        break;
      }
      result.push(line);
    }
  }

  return result.join('\n');
}

/**
 * Chunk a large diff into smaller pieces by file groups
 */
export function chunkDiff(diff: string, maxTokens: number): string[] {
  const fileGroups = groupFilesByDirectory(diff);
  const chunks: string[] = [];
  let currentChunk: string[] = [];
  let currentChunkTokens = 0;

  // Add context header (project structure hint)
  const contextHeader = '# Project Context\nThis diff contains changes across multiple files.\n\n';

  for (const [group, files] of fileGroups.entries()) {
    const groupHeader = `## Changes in ${group}\n\n`;
    const groupHeaderTokens = estimateTokens(groupHeader);

    // Check if we need a new chunk
    if (currentChunkTokens + groupHeaderTokens > maxTokens * 0.8) {
      // Start new chunk
      if (currentChunk.length > 0) {
        chunks.push(contextHeader + currentChunk.join('\n\n'));
      }
      currentChunk = [];
      currentChunkTokens = 0;
    }

    currentChunk.push(groupHeader);
    currentChunkTokens += groupHeaderTokens;

    // Add files from this group
    for (const file of files) {
      const fileDiff = extractFileDiff(diff, file);
      const fileTokens = estimateTokens(fileDiff);

      // If single file is too large, split it further
      if (fileTokens > maxTokens * 0.7) {
        // This file alone is too large - add it as its own chunk
        if (currentChunk.length > 0) {
          chunks.push(contextHeader + currentChunk.join('\n\n'));
          currentChunk = [];
          currentChunkTokens = 0;
        }
        chunks.push(contextHeader + fileDiff);
        continue;
      }

      // Check if adding this file would exceed limit
      if (currentChunkTokens + fileTokens > maxTokens * 0.8) {
        // Start new chunk
        if (currentChunk.length > 0) {
          chunks.push(contextHeader + currentChunk.join('\n\n'));
        }
        currentChunk = [groupHeader];
        currentChunkTokens = groupHeaderTokens;
      }

      currentChunk.push(fileDiff);
      currentChunkTokens += fileTokens;
    }
  }

  // Add remaining chunk
  if (currentChunk.length > 0) {
    chunks.push(contextHeader + currentChunk.join('\n\n'));
  }

  return chunks.length > 0 ? chunks : [diff];
}

