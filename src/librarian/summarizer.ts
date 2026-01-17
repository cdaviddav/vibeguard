import { generateSummary, estimateTokens } from '../utils/llm';
import { cleanDiff } from '../utils/diff-cleaner';
import { chunkDiff } from '../utils/chunker';
import { getMaxTokens } from '../utils/config';

/**
 * Get the Librarian system prompt with current date
 */
function getLibrarianSystemPrompt(): string {
  const today = new Date().toLocaleDateString();
  
  return `# ROLE
You are "The Librarian," an expert Software Architect and Context Manager. Your sole purpose is to maintain the \`PROJECT_MEMORY.md\` file, ensuring it serves as a high-density "Single Source of Truth" for AI coding assistants.

Today's Date: ${today}

# OBJECTIVE
Analyze the provided [INPUT] (Git diffs, file structures, or current memory) and update the \`PROJECT_MEMORY.md\` to reflect the current "State of the World."

# THE MEMORY SCHEMA (Strict Adherence)
You must maintain the following sections in \`PROJECT_MEMORY.md\`:
1. ## Project Soul: A 2-sentence description of what this app is and who it's for.
2. ## Tech Stack: A list of core libraries, frameworks, and versions.
3. ## Architecture: High-level overview of how data flows (e.g., "Next.js App Router -> Supabase -> Stripe").
4. ## Core Rules: Critical "Vibe" rules (e.g., "Always use Tailwind arbitrary values," "No barrel imports").
5. ## Recent Decisions (The "Why"): Document the last 5 major changes and *why* they happened.
6. ## Active Tech Debt: Known bugs or "next steps" that the AI should be aware of.

# PROCESSING LOGIC (The "Density" Rules)
- NEVER list individual file changes (e.g., "Modified App.tsx").
- ALWAYS describe the INTENT (e.g., "Refactored Auth flow to support Multi-tenancy").
- SHRED THE BLOAT: If a change is purely cosmetic (linting, comments), ignore it.
- CONFLICTS: If the new diff contradicts the current memory, prioritize the new diff but note the "superseded" decision.
- TOKEN EFFICIENCY: Keep the entire file under 1,500 words. If it exceeds this, compress the oldest "Recent Decisions."
- DATE CORRECTION: If you see any dates in the existing PROJECT_MEMORY.md that are from 2024, update them to 2026 to reflect the current year. Use today's date (${today}) as a reference for new entries.

# OUTPUT FORMAT
Return the complete, updated Markdown for \`PROJECT_MEMORY.md\`. No conversational filler.`;
}

export class Summarizer {
  /**
   * Build incremental update prompt (current memory + new diff)
   */
  buildIncrementalPrompt(currentMemory: string, cleanDiff: string): string {
    const today = new Date().toLocaleDateString();
    return `Current Memory:
${currentMemory}

New Diff:
${cleanDiff}

Task: Update the memory to reflect these changes. Ensure 'Recent Decisions' is updated and 'Active Tech Debt' is pruned if the bug was fixed. Also, if you see any dates in the existing memory that are from 2024, update them to 2026. Use today's date (${today}) as a reference for new entries.`;
  }

  /**
   * Summarize a diff and return complete updated PROJECT_MEMORY.md
   */
  async summarizeDiff(
    diff: string,
    currentMemory: string = '',
    thinkingLevel: 'flash' | 'pro' = 'flash'
  ): Promise<string> {
    // Clean the diff first (pre-shredder)
    const cleaned = cleanDiff(diff);

    // Check if we need chunking
    const maxTokens = await getMaxTokens();
    const diffTokens = estimateTokens(cleaned);
    const memoryTokens = estimateTokens(currentMemory);
    const totalTokens = diffTokens + memoryTokens;

    // Build prompt
    const today = new Date().toLocaleDateString();
    const prompt = currentMemory
      ? this.buildIncrementalPrompt(currentMemory, cleaned)
      : `New Diff:\n${cleaned}\n\nTask: Create or update PROJECT_MEMORY.md based on this diff. If you see any dates in existing memory that are from 2024, update them to 2026. Use today's date (${today}) as a reference for new entries.`;

    // If total is small enough, process directly
    if (totalTokens < maxTokens * 0.7) {
      return await generateSummary(prompt, getLibrarianSystemPrompt(), {
        thinkingLevel,
        maxTokens,
      });
    }

    // Need chunking - split the diff
    const chunks = chunkDiff(cleaned, maxTokens);
    const summaries: string[] = [];

    // Process each chunk
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      const chunkPrompt = currentMemory
        ? this.buildIncrementalPrompt(currentMemory, chunk)
        : `New Diff (Chunk ${i + 1}/${chunks.length}):\n${chunk}`;

      const summary = await generateSummary(chunkPrompt, getLibrarianSystemPrompt(), {
        thinkingLevel,
        maxTokens,
      });

      summaries.push(summary);

      // Update current memory with first summary for context in subsequent chunks
      if (i === 0 && !currentMemory) {
        currentMemory = summary;
      }
    }

    // Aggregate summaries
    // Note: For multiple chunks, we might need to merge them intelligently
    // For now, use the last summary as it should have the most complete context
    if (summaries.length > 1) {
      // Re-summarize all summaries together
      const aggregatedPrompt = `Multiple summaries were generated from different parts of a large diff. Merge them into a single coherent PROJECT_MEMORY.md:

${summaries.map((s, i) => `## Summary ${i + 1}\n${s}`).join('\n\n')}

Task: Create a single, unified PROJECT_MEMORY.md that combines all the information from these summaries.`;

      return await generateSummary(aggregatedPrompt, getLibrarianSystemPrompt(), {
        thinkingLevel: 'flash', // Use flash for merging (routine task)
        maxTokens,
      });
    }

    return summaries[0] || '';
  }

  /**
   * Infer architecture from file structure and README
   */
  async inferArchitecture(
    fileStructure: string,
    readme?: string,
    thinkingLevel: 'flash' | 'pro' = 'flash'
  ): Promise<string> {
    const today = new Date().toLocaleDateString();
    const prompt = `File Structure:
\`\`\`
${fileStructure}
\`\`\`

${readme ? `README.md:\n\`\`\`\n${readme}\n\`\`\`\n\n` : ''}Task: Analyze the file structure${readme ? ' and README' : ''} to infer:
1. Project Soul (2 sentences: what this app is and who it's for)
2. Tech Stack (core libraries, frameworks, versions - infer from structure)
3. Architecture (high-level data flow description)
4. Core Rules (if detectable from structure/README)

Create a complete PROJECT_MEMORY.md with all required sections. Use today's date (${today}) for any date entries. If you see any dates from 2024 in existing memory, update them to 2026.`;

    const maxTokens = await getMaxTokens();

    return await generateSummary(prompt, getLibrarianSystemPrompt(), {
      thinkingLevel,
      maxTokens,
    });
  }

  /**
   * Merge Git conflicts in PROJECT_MEMORY.md
   */
  async mergeConflicts(conflictedMemory: string): Promise<string> {
    const prompt = `You are "The Librarian," an expert Software Architect and Context Manager.

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
${conflictedMemory}

# OUTPUT
Return only the merged Markdown content, no explanations.`;

    const systemPrompt = `You are a Git conflict resolution expert specializing in Markdown files about software architecture.`;

    const maxTokens = await getMaxTokens();

    return await generateSummary(prompt, systemPrompt, {
      thinkingLevel: 'flash',
      temperature: 0.2, // Lower temperature for more consistent merging
      maxTokens,
    });
  }
}

