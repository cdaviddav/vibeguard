# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management tool that maintains a high-density "Single Source of Truth" for AI coding assistants by monitoring Git history and architectural shifts. It ensures LLMs in AI-driven IDEs have immediate access to architectural intent and the current "State of the World" without manual documentation overhead.

## Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **LLM:** Gemini 3 Flash (Default model for high-speed reasoning and summarization)
- **Protocol:** Model Context Protocol (MCP) for native IDE integration
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic, tsx (execution)
- **Validation:** zod
- **Configuration:** dotenv (Hybrid strategy: Env > .env > Global JSON)

## Architecture
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Diff Pre-shredder (bloat removal) -> Gemini 3 Flash Summarizer (intent extraction) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" by summarizing unstaged changes in real-time and hosts an MCP Server to expose tools (`read_project_memory`, `update_project_memory`) for programmatic AI interaction. A three-tier initialization strategy (Log Sweep, Deep Context, Skeleton Scan) builds context for new repositories.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context; keep it staged in Git to ensure context is versioned alongside code.
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and lockfile updates.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.
- **Loop Prevention:** Explicitly ignore `.vibeguard` and `PROJECT_MEMORY.md` in file watchers.

## Recent Decisions (The "Why")
- **Implemented MCP Protocol Support (13.01.2026):** Added a native MCP server to allow AI IDEs (Cursor, Claude Desktop) to programmatically query and update project context without manual file interaction.
- **Adopted Gemini 3 Flash (13.01.2026):** Selected as the primary engine for its high-speed processing and cost-effective handling of large architectural contexts during high-frequency diff processing.
- **Integrated Pre-shredder & Chunker (13.01.2026):** Developed to handle massive diffs by stripping non-essential data and splitting payloads to fit LLM context windows, resolving previous "Deep Sync" token issues.
- **Three-Tier Initialization Strategy (13.01.2026):** Created a tiered approach (Sweep, Deep Context, Skeleton Scan) to balance token costs and context depth when first analyzing a repository.
- **Atomic Write Implementation (13.01.2026):** Switched to `write-file-atomic` to prevent `PROJECT_MEMORY.md` corruption during interrupted watch processes or concurrent writes.

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios and multi-user environments.
- **MCP Search Tool:** The MCP server currently serves the entire memory file; needs a targeted "Search" tool for context retrieval in massive projects.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss changes during specific complex rebase scenarios or fast-forward merges.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 5 to prevent token exhaustion in large monorepos.