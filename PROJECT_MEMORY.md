# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management tool that maintains a high-density "Single Source of Truth" for AI coding assistants by monitoring Git history and architectural shifts. It ensures LLMs in AI-driven IDEs have immediate access to architectural intent and the current "State of the World" without manual documentation overhead.

## Tech Stack
- **Runtime/Language:** Node.js, TypeScript (executed via `tsx`)
- **Frontend:** React 18, Vite, Tailwind CSS (Cyberpunk Theme), Lucide React, Framer Motion
- **Visualization:** Mermaid.js (Client-side rendering), React-Markdown
- **LLM:** Gemini 3 Flash (Routine summarization) & Gemini 3 Pro (Architectural reasoning)
- **Protocol:** Model Context Protocol (MCP) for native IDE integration
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic
- **Server:** Express (Dashboard API), Open (Browser integration)
- **Validation/Config:** zod, dotenv (Env > .env > Global JSON)

## Architecture
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Range-based Diff Pre-shredder -> Tiered LLM Summarizer -> Memory Manager -> `PROJECT_MEMORY.md`. The system features an autonomous maintenance loop: a **Heartbeat** service monitors inactivity to trigger **Quiet Reflection** (Oracle analysis), which performs deep project scans (up to 15 levels) to identify architectural drift. These "Prophecies" are visualized in a React-based Dashboard via a local Express API and can be resolved via the **AutoFixService**, which manages isolated Git branches and AI-driven refactoring using atomic writes.

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
- **Fully Integrated Autonomous Maintenance Loop (18.01.2026):** Connected Heartbeat and AutoFix services to the main watcher lifecycle. The system records activity on every commit and triggers "Quiet Reflection" via the Oracle after 10 minutes of idle time. AutoFixService is now capable of full-cycle repair: branch creation, AI-driven file identification, refactoring, and atomic commits.
- **Finalized OracleService Implementation for Architectural Drift Detection (18.01.2026):** Completed core logic for the Oracle, performing deep project scans (15-level depth) using Gemini 3 Pro to identify "prophecies" (Refactor, RuleViolation, Optimization). Implemented state persistence in `.vibeguard/oracle.json` with a 20-entry rolling buffer and automated JSON extraction.
- **Standardized Dashboard Data Fetching via usePulse Hook (18.01.2026):** Centralized prophecy management in a custom hook, implementing 10-second polling and mapping API responses to cyberpunk UI components. Optimized `ThePulse` component to focus on watcher status and feed orchestration.
- **Implemented AutoFixService for Programmatic Architectural Drift Resolution (18.01.2026):** Created service to apply fixes to Oracle prophecies. It creates isolated branches (`vibeguard/fix-[id]`), uses Gemini 3 Pro for refactors, and performs atomic commits. Integrated with Dashboard via `POST /api/fix` and updated UI with "Fix with AI" triggers and loading states.
- **Implemented Pulse Feed Component with Cyberpunk Styling (18.01.2026):** Developed a high-end notification system including `Pulse.tsx` and `ProphecyCard.tsx`. Features type-based glow effects (Yellow: Violation, Purple: Refactor, Emerald: Optimization) and Framer Motion animations (slide-in/pixel-dissolve).
- **Introduced Integrated Web Dashboard (17.01.2026):** Developed a React/Vite-based visual interface to expose project memory and architecture, improving accessibility of AI insights via the `dashboard` CLI command.
- **Optimized LLM Task Allocation (17.01.2026):** Explicitly mapped Gemini 3 Flash to routine diff summarization and Gemini 3 Pro to high-level architecture inference to maximize performance and cost-efficiency.
- **Hardened Watcher Stability (17.01.2026):** Increased Chokidar stability thresholds and added explicit ignores for Git lock files to prevent race conditions.
- **Externalized Memory Compaction (17.01.2026):** Delegated density management to a specialized compaction tool to preserve historical context during active sessions.

## Legacy Decisions
- **Implemented Tiered LLM Reasoning (17.01.2026):** Introduced dual-model strategy for high-speed summarization vs. complex architectural pruning.
- **Refactored LLM Configuration and Caching (17.01.2026):** Migrated to explicit model configurations and implemented an instance cache.
- **Implemented Range-Based Diffing (17.01.2026):** Upgraded watcher to calculate diffs across `lastProcessed..HEAD` to ensure no changes are missed.
- **Decoupled Project Memory from Version Control (14.01.2026):** Moved memory files to `.gitignore` to prevent repository history bloat.
- **Formalized Cursor Rule Protocols (14.01.2026):** Codified strict `.mdc` rules for AI assistant initialization.

## Active Tech Debt
- **AutoFix Validation:** Need to implement "Pre-Commit Validation" (e.g., `npm run build` or `tsc`) within AutoFixService to ensure AI fixes don't introduce syntax errors.
- **Dashboard API Implementation:** Backend API handlers need robust implementation to serve real-time memory and diagram data consistently.
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires hardening for complex branch rebase scenarios.
- **MCP Search Tool:** Need a targeted "Search" tool for context retrieval in massive projects where memory exceeds token limits.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss triggers during specific complex rebases.
- **Skeleton Scan Depth:** Architecture inference is currently capped at a directory depth of 10, while Oracle scans at 15; these should be aligned.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- src/dashboard/package.json
- .cursor/rules/ (All .mdc files)