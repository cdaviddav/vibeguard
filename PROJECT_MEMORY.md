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
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Diff Pre-shredder (bloat removal) -> Gemini 3 Flash Summarizer (intent extraction) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" by summarizing unstaged changes in real-time and hosts an MCP Server to expose tools for programmatic AI interaction. A "Pinned Files" mechanism allows the `get_core_context` tool to aggregate and serve critical project files (e.g., schema, config) alongside the memory file for immediate task initialization.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context; keep it staged in Git to ensure context is versioned alongside code.
- **Context Initialization:** AI assistants must call `get_core_context` before starting any task. They must check `DIAGRAM.md` freshness against `src/` and run `vibeguard visualize` if the architecture is stale.
- **Atomic Updates:** Group related changes into a single "Atomic Update" when updating memory. If `Recent Decisions` exceeds 15 entries, summarize the oldest 5 into a "Legacy Decisions" block.
- **Visual Standards:** Mermaid diagrams must use `direction TB` for the root and `direction LR` for subgraphs. Use specific classDef colors: Internal Logic (#e8f5e9), External Services (#e1f5fe), and Storage/Files (#fff8e1).
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and lockfile updates.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.
- **Loop Prevention:** Explicitly ignore `.vibeguard` and `PROJECT_MEMORY.md` in file watchers.
- **Auto-Summarization:** AI assistants must use the `update_project_memory` tool after every task to maintain real-time context.

## Recent Decisions (The "Why")
- **Formalized Cursor Rule Protocols for Context & Visualization (14.01.2026):** Codified strict protocols for AI assistants via `.mdc` rules. This mandates staleness checks for architecture diagrams, enforces atomic memory updates with pruning logic, and standardizes Mermaid styling to ensure consistent AI behavior across sessions.
- **Enhanced Visual Soul with Color Styling (14.01.2026):** Extended the `vibeguard visualize` command to include color-coded Mermaid diagrams with a three-tier color scheme: External Services (Light Blue), Internal Logic (Light Green), and Persistence/Files (Soft Amber). This makes architecture diagrams more visually intuitive and easier to parse at a glance.
- **Added Visual Soul CLI Command (14.01.2026):** Implemented `vibeguard visualize` command that automatically scans the src/ directory and uses Gemini 3 Flash to generate a valid Mermaid.js architecture diagram. The diagram is saved to DIAGRAM.md with strict syntax validation and is automatically included in the core context.
- **Implemented `get_core_context` and Pinned Files logic (14.01.2026):** Created a tool to aggregate contents of critical files defined in the "Pinned Files" section. This ensures AI assistants have immediate access to the most vital code/config without manual searching.
- **Mandated Context Initialization via Cursor Rules (14.01.2026):** Added a global rule requiring AI to call `get_core_context` at the start of any task, ensuring the assistant is always aligned with the latest Project Soul and Schema.

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios and multi-user environments.
- **MCP Search Tool:** The MCP server currently serves the entire memory file; needs a targeted "Search" tool for context retrieval in massive projects.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss changes during specific complex rebase scenarios or fast-forward merges.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 5 to prevent token exhaustion in large monorepos.

## Session Summary (14.01.2026)
**Completed:**
- ✅ Codified `.mdc` rules for atomic memory updates and pruning logic.
- ✅ Implemented staleness check protocol: `src/` vs `DIAGRAM.md` verification before task start.
- ✅ Standardized Mermaid styling (colors and layout directions) via Cursor rules.
- ✅ Integrated safety checks to prevent AI from proposing changes that contradict "Pinned Files" logic.
- ✅ Enhanced `get_core_context` workflow to prioritize `DIAGRAM.md` for component identification.

**No Blockers:** All automation rules are active and enforced by the IDE.

**Next Steps:**
- Monitor the effectiveness of the "Atomic Update" pruning logic once the decision log grows.
- Implement auto-fix logic for Mermaid syntax errors if the LLM generates invalid diagram code.

## Pinned Files
- PROJECT_MEMORY.md
- package.json
- .cursor/rules/ (All .mdc files)