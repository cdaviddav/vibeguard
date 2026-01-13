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

