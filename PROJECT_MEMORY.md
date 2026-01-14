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
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Diff Pre-shredder (bloat removal) -> Gemini 3 Flash Summarizer (intent extraction) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" by summarizing unstaged changes in real-time and hosts an MCP Server to expose tools for programmatic AI interaction. A "Pinned Files" mechanism allows the `get_core_context` tool to aggregate and serve critical project files (e.g., schema, config) and the `DIAGRAM.md` architecture visualization for immediate task initialization.

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
- **Decoupled Project Memory from Version Control (14.01.2026):** Moved `PROJECT_MEMORY.md` and `DIAGRAM.md` to `.gitignore`. This prevents high-frequency documentation updates from bloating Git history, treating memory as a local "State of the World" artifact rather than versioned source code.
- **Formalized Cursor Rule Protocols for Context & Visualization (14.01.2026):** Codified strict protocols for AI assistants via `.mdc` rules. This mandates staleness checks for architecture diagrams, enforces atomic memory updates with pruning logic, and standardizes Mermaid styling.
- **Enhanced Visual Soul with Color Styling (14.01.2026):** Extended the `vibeguard visualize` command to include color-coded Mermaid diagrams with a three-tier color scheme: External Services (Blue), Internal Logic (Green), and Persistence (Amber).
- **Added Visual Soul CLI Command (14.01.2026):** Implemented `vibeguard visualize` command that automatically scans the src/ directory and uses Gemini 3 Flash to generate a valid Mermaid.js architecture diagram.
- **Implemented `get_core_context` and Pinned Files logic (14.01.2026):** Created a tool to aggregate contents of critical files defined in the "Pinned Files" section, ensuring AI assistants have immediate access to vital code/config.

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios and multi-user environments.
- **MCP Search Tool:** The MCP server currently serves the entire memory file; needs a targeted "Search" tool for context retrieval in massive projects.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss changes during specific complex rebase scenarios or fast-forward merges.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 10 to prevent token exhaustion in large monorepos.

## Session Summary (14.01.2026)
**Completed:**
- ✅ Updated `.gitignore` to exclude `PROJECT_MEMORY.md` and `DIAGRAM.md` from version control.
- ✅ Refactored Core Rules to reflect the shift from versioned memory to git-ignored local state.
- ✅ Pruned "Recent Decisions" to maintain high density and focus on the latest architectural shifts.

**No Blockers:** The transition to git-ignored memory reduces repository noise without impacting AI context access via MCP.

**Next Steps:**
- Ensure the `get_core_context` tool correctly resolves the git-ignored memory files across different local environments.
- Monitor if the lack of versioned history for `PROJECT_MEMORY.md` impacts the ability to recover context after a fresh clone.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- .cursor/rules/ (All .mdc files)