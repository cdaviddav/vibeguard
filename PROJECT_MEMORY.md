# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management tool that maintains a high-density "Single Source of Truth" for AI coding assistants by monitoring Git history and architectural shifts. It ensures LLMs in AI-driven IDEs have immediate access to architectural intent and the current "State of the World" without manual documentation overhead.

## Tech Stack
- **Runtime:** Node.js
- **Language:** TypeScript
- **LLM:** Gemini 3 Flash (Routine tasks) & Gemini 3 Pro (Complex reasoning/Architecture)
- **Protocol:** Model Context Protocol (MCP) for native IDE integration
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic, tsx (execution)
- **Validation:** zod
- **Configuration:** dotenv (Hybrid strategy: Env > .env > Global JSON)

## Architecture
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Range-based Diff Pre-shredder -> Tiered LLM Summarizer (Flash for diffs, Pro for architecture) -> Memory Manager -> `PROJECT_MEMORY.md`. The system supports "Draft Memory" for unstaged changes and hosts an MCP Server to expose tools for programmatic AI interaction. A "Pinned Files" mechanism allows the `get_core_context` tool to aggregate critical project files and the `DIAGRAM.md` architecture visualization for immediate task initialization.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context. It is git-ignored but maintained locally as the primary reference for AI assistants.
- **Tiered Reasoning:** Use "Flash" models for routine summarization and merging; use "Pro" models for architectural pruning, diagram generation, and complex reasoning.
- **Context Initialization:** AI assistants must call `get_core_context` before starting any task and verify `DIAGRAM.md` freshness.
- **Atomic Updates:** Group related changes into a single "Atomic Update." If `Recent Decisions` exceeds 15 entries, summarize the oldest 5 into a "Legacy Decisions" block.
- **Visual Standards:** Mermaid diagrams must use `direction TB` for the root and `direction LR` for subgraphs with specific classDef colors for Logic, Services, and Storage.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, and lockfile updates.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.

## Recent Decisions (The "Why")
- **Shifted to Preservation-First Memory Management (17.01.2026):** Removed automated word-count truncation and "Recent Decisions" pruning from the core `MemoryManager` logic. This prevents accidental loss of historical context during merges and delegates density management to the Librarian's summarization logic rather than hard-coded string manipulation.
- **Implemented Tiered LLM Reasoning (17.01.2026):** Introduced a dual-model strategy using Gemini 3 Flash for high-speed routine summarization and Gemini 3 Pro for complex architectural pruning and diagram generation. This optimizes token costs while maintaining high reasoning quality for structural changes.
- **Refactored LLM Configuration and Caching (17.01.2026):** Migrated to explicit `flashModel` and `proModel` configurations and implemented a model instance cache. This reduces initialization overhead and provides clearer control over which model handles specific task complexities.
- **Purged Debug Telemetry and Agent Logging (17.01.2026):** Removed verbose HTTP-based telemetry and "agent log" hooks. This cleans up the codebase following the stabilization of range-based diffing and self-healing logic, reducing execution side effects.
- **Implemented Range-Based Diffing (17.01.2026):** Upgraded the watcher to calculate diffs across a range of commits (lastProcessed..HEAD) instead of just the latest commit, ensuring no architectural changes are missed during rapid commit bursts.

## Legacy Decisions
- **Implemented Watcher State Recovery (17.01.2026):** Added logic to reset the `isProcessing` flag upon watcher startup to ensure system recovery from crashes.
- **Decoupled Project Memory from Version Control (14.01.2026):** Moved `PROJECT_MEMORY.md` and `DIAGRAM.md` to `.gitignore` to prevent history bloat.
- **Formalized Cursor Rule Protocols (14.01.2026):** Codified strict protocols via `.mdc` rules for AI assistant initialization and memory updates.

## Active Tech Debt
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires more robust testing on complex branch rebase scenarios.
- **MCP Search Tool:** The MCP server needs a targeted "Search" tool for context retrieval in massive projects where memory exceeds token limits.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may still miss triggers during specific complex rebase scenarios, though diff range logic mitigates data loss.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 10.

## Session Summary (17.01.2026)
**Completed:**
- ✅ Decommissioned automated memory truncation to favor LLM-driven context preservation.
- ✅ Implemented Tiered LLM Reasoning (Flash vs Pro) across the summarizer and MCP server.
- ✅ Added model instance caching to improve performance during high-frequency updates.
- ✅ Purged verbose debug telemetry and agent logging.
- ✅ Implemented self-healing logic for the Librarian Watcher state.
- ✅ Integrated range-based Git diffing for continuous context tracking.
- ✅ Added `write-file-atomic` for robust memory persistence.

**Next Steps:**
- Investigate edge cases in `.git/HEAD` monitoring triggers during complex rebases.
- Develop the targeted search tool for the MCP server.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- .cursor/rules/ (All .mdc files)