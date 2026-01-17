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
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Range-based Diff Pre-shredder (capturing all changes between processed states) -> Gemini 3 Flash Summarizer (intent extraction) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" by summarizing unstaged changes in real-time and hosts an MCP Server to expose tools for programmatic AI interaction. A "Pinned Files" mechanism allows the `get_core_context` tool to aggregate and serve critical project files and the `DIAGRAM.md` architecture visualization for immediate task initialization.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context. It is git-ignored to prevent commit noise, but must be maintained locally as the primary reference for AI assistants.
- **Context Initialization:** AI assistants must call `get_core_context` before starting any task. They must check `DIAGRAM.md` freshness against `src/` and run `vibeguard visualize` if the architecture is stale.
- **Atomic Updates:** Group related changes into a single "Atomic Update" when updating memory. If `Recent Decisions` exceeds 15 entries, summarize the oldest 5 into a "Legacy Decisions" block.
- **Visual Standards:** Mermaid diagrams must use `direction TB` for the root and `direction LR` for subgraphs. Use specific classDef colors: Internal Logic (#e8f5e9), External Services (#e1f5fe), and Storage/Files (#fff8e1).
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and lockfile updates.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.
- **Loop Prevention:** Explicitly ignore `.vibeguard` and `PROJECT_MEMORY.md` in file watchers.
- **Auto-Summarization:** AI assistants must use the `update_project_memory` tool after every task to maintain real-time context.

## Recent Decisions (The "Why")
- **Implemented Range-Based Diffing (17.01.2026):** Upgraded the watcher to calculate diffs across a range of commits (lastProcessed..HEAD) instead of just the latest commit. This ensures architectural changes are never missed if multiple commits occur rapidly between watcher cycles.
- **Implemented Watcher State Recovery (17.01.2026):** Added logic to reset the `isProcessing` flag upon watcher startup. This ensures the system recovers gracefully from crashes or forced interruptions, preventing the memory manager from being permanently locked.
- **Decoupled Project Memory from Version Control (14.01.2026):** Moved `PROJECT_MEMORY.md` and `DIAGRAM.md` to `.gitignore`. This prevents high-frequency documentation updates from bloating Git history, treating memory as a local "State of the World" artifact.
- **Formalized Cursor Rule Protocols (14.01.2026):** Codified strict protocols for AI assistants via `.mdc` rules, mandating staleness checks for architecture diagrams and enforcing atomic memory updates.
- **Enhanced Visual Soul with Color Styling (14.01.2026):** Extended the `vibeguard visualize` command to include color-coded Mermaid diagrams with a three-tier color scheme: External Services (Blue), Internal Logic (Green), and Persistence (Amber).

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios and multi-user environments.
- **MCP Search Tool:** The MCP server currently serves the entire memory file; needs a targeted "Search" tool for context retrieval in massive projects.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may still miss triggers during specific complex rebase scenarios or fast-forward merges, even though the diff range logic now captures the content correctly.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 10 to prevent token exhaustion in large monorepos.

## Session Summary (17.01.2026)
**Completed:**
- ✅ Implemented self-healing logic for the Librarian Watcher to reset stale processing states on boot.
- ✅ Integrated range-based Git diffing to capture all architectural shifts between processing cycles.
- ✅ Added fallback mechanisms for Git diff failures to ensure continuous context tracking.

**No Blockers:** The system now reliably captures multi-commit bursts.

**Next Steps:**
- Investigate edge cases in `.git/HEAD` monitoring triggers during complex rebases.
- Develop the targeted search tool for the MCP server to handle memory files exceeding token limits.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- .cursor/rules/ (All .mdc files)