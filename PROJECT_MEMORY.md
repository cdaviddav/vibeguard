# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management tool that monitors Git history and file structures to maintain a high-density "Single Source of Truth" for AI coding assistants. It ensures LLMs have immediate access to architectural intent and the current "State of the World" via an automated `PROJECT_MEMORY.md` file.

## Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **LLM:** Gemini 3 Flash (via Google AI Studio) for high-speed, low-cost summarization
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic
- **Integration:** @modelcontextprotocol/sdk (MCP server for Cursor/AI IDEs)
- **Validation:** zod
- **Configuration:** dotenv (Hybrid strategy: Env > .env > Global JSON)

## Architecture
The system is a CLI-based tool operating in Watcher or Sync modes. It monitors Git lifecycle events (via `chokidar` and `.git/HEAD`) and processes diffs through an LLM-powered "Pre-Shredder" to condense changes into architectural intent. The `MemoryManager` performs atomic writes to `PROJECT_MEMORY.md` to ensure persistence, while a three-tier initialization strategy (Log Sweep, Deep Context, and Skeleton Scan) builds context for new repositories.

## Core Rules
- **Density over Detail:** Never list individual file changes; always describe the architectural intent and the "why" behind changes.
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context; all AI interactions should reference it.
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and dependency updates (lockfiles) in summaries.
- **Atomic Persistence:** All writes to the memory file must use `write-file-atomic` to prevent corruption during concurrent processes or interruptions.
- **Auto-Sync:** The memory file must be automatically staged whenever a code change is detected and processed to keep context synchronized with history.

## Recent Decisions (The "Why")
- **Automated Temporal Awareness and Date Correction (13.01.2026):** Refactored prompt generation to dynamically inject the current date and implemented a mandatory "Date Correction" rule. This ensures the Librarian remains aware of the current time and automatically migrates legacy 2024 references to 2026 to maintain historical consistency.
- **Hardened Watcher Stability and Loop Prevention (13.01.2026):** Updated the file watcher to explicitly ignore `.vibeguard` and `PROJECT_MEMORY.md`, preventing infinite feedback loops where the tool triggers itself. Increased stability thresholds to accommodate slower file systems during intensive Git operations.
- **Hardened Git Initialization for New Repositories (13.01.2026):** Refactored the log sweep logic and `GitUtils` to gracefully handle empty repositories and raw Git edge cases. This ensures the tool works immediately upon `git init` without requiring an initial commit.
- **Hybrid Configuration Strategy (13.01.2026):** Implemented priority-based configuration (Env > .env > Global JSON) to ensure seamless operation across local development, CI/CD, and global CLI usage.
- **Adopted Gemini 3 Flash (13.01.2026):** Selected as the primary LLM for its high speed and low cost, making frequent "Watch Mode" updates and large diff processing economically viable.

## Active Tech Debt
- **MCP Server Implementation:** The `mcp-server.ts` is present but requires full implementation to properly support the Model Context Protocol for AI IDEs.
- **Watcher Robustness:** While loop prevention is implemented, monitoring of `.git/HEAD` may still miss changes during complex rebase scenarios or fast-forward merges.
- **Deep Sync Token Usage:** Full history processing remains token-intensive; requires a more aggressive chunking or sampling strategy for massive repositories.
- **Conflict Resolution:** AI-driven conflict resolution for `PROJECT_MEMORY.md` needs more edge-case testing, specifically for multi-user environments and divergent branches.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 5 to prevent token exhaustion in large monorepos.