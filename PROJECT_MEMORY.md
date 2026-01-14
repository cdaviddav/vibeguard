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
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Diff Pre-shredder (bloat removal) -> Gemini 3 Flash Summarizer (intent extraction) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" by summarizing unstaged changes in real-time and hosts an MCP Server to expose tools for programmatic AI interaction. Memory updates via MCP are granular, targeting specific markdown sections rather than overwriting the entire file to preserve context integrity and reduce token overhead.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context; keep it staged in Git to ensure context is versioned alongside code.
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and lockfile updates.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.
- **Loop Prevention:** Explicitly ignore `.vibeguard` and `PROJECT_MEMORY.md` in file watchers.
- **Auto-Summarization:** AI assistants must use the `update_project_memory` tool after every task to maintain real-time context without manual prompting.

## Recent Decisions (The "Why")
- **Automated Memory Updates via Cursor Rules (14.01.2026):** Integrated a global Cursor rule (`.mdc`) that mandates AI assistants to update the project memory using MCP tools upon task completion. This removes manual documentation friction and ensures the "State of the World" is always current.
- **Shifted MCP Memory Updates to Section-Based Appending (14.01.2026):** Replaced full-file overwrites with targeted section appending in the MCP server. This optimization reduces the risk of data loss during concurrent AI writes, lowers token consumption for updates, and allows the AI to contribute to specific logs without needing to process the entire document.
- **Fixed Gemini API Safety Filter Handling (13.01.2026):** Resolved empty response errors in the check command by configuring safety settings at model initialization (BLOCK_NONE for harassment/hate speech/sexually explicit). Added finishReason validation to detect and report safety blocks.
- **Added Check Command (13.01.2026):** Implemented `vibeguard check` command to verify environment setup, API key validity, Git repository status, and PROJECT_MEMORY.md existence. Provides a quick health check with colored status indicators.
- **Implemented MCP Protocol Support (13.01.2026):** Added a native MCP server to allow AI IDEs (Cursor, Claude Desktop) to programmatically query and update project context without manual file interaction.

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios and multi-user environments.
- **MCP Search Tool:** The MCP server currently serves the entire memory file; needs a targeted "Search" tool for context retrieval in massive projects.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss changes during specific complex rebase scenarios or fast-forward merges.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 5 to prevent token exhaustion in large monorepos.