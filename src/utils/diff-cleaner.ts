/**
 * Pre-Shredder: Clean diffs before sending to LLM
 * Removes bloat like lockfiles, build outputs, node_modules, etc.
 */

/**
 * Check if a file path should be ignored
 */
export function shouldIgnoreFile(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  
  // Ignore patterns
  const ignorePatterns = [
    /node_modules\//,
    /\.lock$/,
    /\.log$/,
    /^dist\//,
    /^build\//,
    /^\.next\//,
    /^out\//,
    /^\.git\//,
    /^\.vibeguard\//,
    /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i, // Binary assets
    /\.(exe|dll|so|dylib)$/i, // Compiled binaries
  ];

  return ignorePatterns.some(pattern => pattern.test(normalized));
}

/**
 * Check if a diff line represents a file that should be ignored
 */
function isIgnoredFileLine(line: string): boolean {
  // Git diff file headers: diff --git a/path b/path
  // or: +++ b/path or --- a/path
  const fileHeaderPatterns = [
    /^diff --git a\/(.+)$/,
    /^\+\+\+ b\/(.+)$/,
    /^--- a\/(.+)$/,
  ];

  for (const pattern of fileHeaderPatterns) {
    const match = line.match(pattern);
    if (match && match[1]) {
      return shouldIgnoreFile(match[1]);
    }
  }

  return false;
}

/**
 * Check if a change is purely cosmetic (linting, comments, whitespace)
 */
export function isCosmeticChange(diff: string): boolean {
  const lines = diff.split('\n');
  let hasCodeChanges = false;
  let hasOnlyCosmetic = true;

  for (const line of lines) {
    // Skip context lines and file headers
    if (line.startsWith('@@') || line.startsWith('diff') || 
        line.startsWith('+++') || line.startsWith('---') ||
        line.startsWith('index') || line.startsWith('---')) {
      continue;
    }

    // Check for actual code changes (not just whitespace/comments)
    if (line.startsWith('+') || line.startsWith('-')) {
      const content = line.substring(1).trim();
      
      // Ignore pure whitespace changes
      if (content.length === 0) continue;
      
      // Check if it's just a comment change
      if (/^\/\/|\/\*|\*\/|#/.test(content) && content.length < 50) {
        continue;
      }

      // If we get here, it's likely a real code change
      hasCodeChanges = true;
      hasOnlyCosmetic = false;
      break;
    }
  }

  return hasCodeChanges === false || hasOnlyCosmetic;
}

/**
 * Clean diff by removing bloat (Pre-Shredder logic)
 */
export function cleanDiff(rawDiff: string): string {
  const lines = rawDiff.split('\n');
  const cleaned: string[] = [];
  let inIgnoredFile = false;
  let currentFile = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if this line starts a new file section
    if (line.startsWith('diff --git')) {
      const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
      if (match) {
        currentFile = match[2];
        inIgnoredFile = shouldIgnoreFile(currentFile);
        
        if (!inIgnoredFile) {
          cleaned.push(line);
        }
        continue;
      }
    }

    // If we're in an ignored file, skip all lines until next file
    if (inIgnoredFile) {
      // Check if we've moved to a new file
      if (line.startsWith('diff --git')) {
        const match = line.match(/^diff --git a\/(.+?) b\/(.+)$/);
        if (match) {
          currentFile = match[2];
          inIgnoredFile = shouldIgnoreFile(currentFile);
          if (!inIgnoredFile) {
            cleaned.push(line);
          }
        }
      }
      continue;
    }

    // Filter out specific patterns
    if (line.match(/lockfile|package-lock\.json|dist\/|build\//)) {
      continue;
    }

    // Remove binary file diffs
    if (line.match(/Binary files/)) {
      continue;
    }

    // Remove node_modules references
    if (line.includes('node_modules/')) {
      continue;
    }

    // Keep the line
    cleaned.push(line);
  }

  return cleaned.join('\n');
}

