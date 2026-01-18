# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management tool that maintains a high-density "Single Source of Truth" for AI coding assistants by monitoring Git history and architectural shifts. It ensures LLMs in AI-driven IDEs have immediate access to architectural intent and the current "State of the World" without manual documentation overhead.

## Tech Stack
- **Runtime/Language:** Node.js, TypeScript (executed via `tsx`)
- **Frontend:** React 18, Vite, Tailwind CSS (Cyberpunk Theme), Lucide React
- **Visualization:** Mermaid.js (Client-side rendering), React-Markdown
- **LLM:** Gemini 3 Flash (Routine summarization) & Gemini 3 Pro (Architectural reasoning)
- **Protocol:** Model Context Protocol (MCP) for native IDE integration
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic
- **Server:** Express (Dashboard API), Open (Browser integration)
- **Validation/Config:** zod, dotenv (Env > .env > Global JSON)

## Architecture
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Range-based Diff Pre-shredder -> Tiered LLM Summarizer (Flash for diffs, Pro for architecture) -> Memory Manager -> `PROJECT_MEMORY.md`. The system includes a React-based Dashboard (`src/dashboard`) that consumes a local Express API to visualize "The Soul" (Memory), "The Map" (Architecture diagrams), and "The Pulse" (Watcher status). A "Pinned Files" mechanism allows the `get_core_context` tool to aggregate critical project files and the `DIAGRAM.md` for immediate AI task initialization.

## Core Rules
- **Density over Detail:** Never list individual file changes; describe architectural intent and the "why."
- **Single Source of Truth:** `PROJECT_MEMORY.md` is the authoritative context. It is git-ignored but maintained locally as the primary reference for AI assistants.
- **Tiered Reasoning:** Use "Flash" models for routine summarization; use "Pro" models for architectural pruning and complex reasoning.
- **Context Initialization:** AI assistants must call `get_core_context` before starting any task and verify `DIAGRAM.md` freshness.
- **Atomic Updates:** Group related changes into a single "Atomic Update." If `Recent Decisions` exceeds 15 entries, summarize the oldest 5 into a "Legacy Decisions" block.
- **Visual Standards:** Mermaid diagrams must use `direction TB` for the root and `direction LR` for subgraphs with specific classDef colors for Logic, Services, and Storage.
- **Atomic Persistence:** Use `write-file-atomic` to prevent corruption during concurrent processes or interrupted watchers.
- **Bloat Shredding:** Automatically ignore cosmetic changes, linting, whitespace, lockfiles, and Git internal temporary files.
- **Temporal Awareness:** Always use 2026 for new entries; automatically migrate legacy 2024 references to 2026.

## Recent Decisions (The "Why")
- **Implemented AutoFixService for Programmatic Architectural Drift Resolution (18.01.2026):** Created AutoFixService class that automatically applies fixes to prophecies identified by the Oracle. Service creates isolated Git branches (vibeguard/fix-[short-id]), uses Gemini 3 Pro to identify affected files and apply refactors, then commits changes with descriptive messages. Includes safety checks: verifies clean working directory before fixes, validates file existence, uses atomic file writes. Integrated POST /api/fix endpoint in Dashboard API. Updated ProphecyCard component with "Fix with AI" button that triggers autofix, shows loading state with spinner, and displays error messages. Service handles branch cleanup on failures and returns branch name to frontend for user notification.
- **Implemented Pulse Feed Component with Cyberpunk Styling (18.01.2026):** Created high-end Pulse component system for VibeGuard Dashboard including Pulse.tsx (scrolling feed container), ProphecyCard.tsx (cyberpunk-styled prophecy cards with type-based border glow effects - yellow for RuleViolation, purple for Refactor, emerald for Optimization), and usePulse hook (mock data management with acknowledge/add functionality). Integrated Framer Motion for slide-and-fade entry animations and pixel-dissolve exit effects. Cards feature semi-transparent dark slate backgrounds with backdrop blur, type-specific icons (AlertTriangle, Hammer, Zap), code-styled action snippets, and "Fix with AI" / "Acknowledge" buttons. ThePulse.tsx now uses Pulse component for feed display while maintaining watcher status section. Added framer-motion dependency to dashboard package.
- **Introduced OracleService for Architectural Drift Detection (18.01.2026):** Implemented proactive intelligence system that scans PROJECT_MEMORY.md, DIAGRAM.md, and file structure to identify architectural drift using Gemini 3 Pro. The Oracle generates JSON prophecies (Refactor, RuleViolation, Optimization) with priorities and stores them in `.vibeguard/oracle.json`. Integrated with Dashboard API via `/api/pulse` endpoint for real-time insight display. Added Heartbeat service that triggers "Quiet Reflection" (oracle analysis) after 10 minutes of inactivity when watcher is running.
- **Introduced Integrated Web Dashboard (17.01.2026):** Developed a React/Vite-based visual interface to expose project memory and architecture. This provides a human-centric view of the project's state and improves accessibility of AI insights via a new `dashboard` CLI command.
- **Optimized LLM Task Allocation (17.01.2026):** Explicitly mapped Gemini 3 Flash to routine diff summarization and Gemini 3 Pro to high-level architecture inference to maximize performance and cost-efficiency.
- **Hardened Watcher Stability (17.01.2026):** Increased Chokidar stability thresholds and added explicit ignores for Git lock files and commit messages to prevent race conditions during rapid Git operations.
- **Externalized Memory Compaction (17.01.2026):** Delegated density management to a specialized compaction tool rather than performing inline truncation, preserving historical context during active sessions.

## Legacy Decisions
- **Implemented Tiered LLM Reasoning (17.01.2026):** Introduced dual-model strategy for high-speed summarization vs. complex architectural pruning.
- **Refactored LLM Configuration and Caching (17.01.2026):** Migrated to explicit model configurations and implemented an instance cache.
- **Implemented Range-Based Diffing (17.01.2026):** Upgraded watcher to calculate diffs across `lastProcessed..HEAD` to ensure no changes are missed.
- **Decoupled Project Memory from Version Control (14.01.2026):** Moved memory files to `.gitignore` to prevent repository history bloat.
- **Formalized Cursor Rule Protocols (14.01.2026):** Codified strict `.mdc` rules for AI assistant initialization.

## Active Tech Debt
- **Dashboard API Implementation:** Backend API handlers need robust implementation to serve real-time memory and diagram data to the React frontend.
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires hardening for complex branch rebase scenarios.
- **MCP Search Tool:** Need a targeted "Search" tool for context retrieval in massive projects where memory exceeds token limits.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss triggers during specific complex rebases; further investigation into trigger reliability is required.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 10.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- src/dashboard/package.json
- .cursor/rules/ (All .mdc files)