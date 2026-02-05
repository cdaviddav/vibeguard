# PROJECT_MEMORY.md

## Project Soul
VibeGuard is a context management application that maintains a high-density "Single Source of Truth" for AI coding assistants by monitoring Git history and architectural shifts. It ensures LLMs in AI-driven IDEs have immediate access to architectural intent and the current "State of the World" without manual documentation overhead.

## Tech Stack
- **Runtime/Language:** Node.js, TypeScript (executed via `tsx`)
- **Frontend:** React 18, Vite, Tailwind CSS (Premium Design System: `vg-` prefix, Bento Grid layout, Electric Indigo, Vibrant Violet, Glassmorphism, Noise textures), Lucide React, Framer Motion
- **Typography:** Inter (Sans), JetBrains Mono (Code)
- **Visualization:** Mermaid.js (Premium Dark Theme, Custom SVG styling, Client-side rendering), React-Markdown
- **LLM:** Gemini 3 Flash (Routine summarization) & Gemini 3 Pro (Architectural reasoning)
- **Protocol:** Model Context Protocol (MCP) for native IDE integration
- **Git & File System:** simple-git, chokidar (watcher), write-file-atomic
- **Server:** Express (Dashboard API), Open (Browser integration)
- **Validation/Config:** zod, dotenv (Env > .env > Global JSON)

## Architecture
VibeGuard operates as a pipeline: Git Watcher/CLI triggers -> Range-based Diff Pre-shredder -> Tiered LLM Summarizer -> Memory Manager -> `PROJECT_MEMORY.md`. The system is organized into a **Librarian Module** (Watcher, Summarizer, Memory Manager, Heartbeat, Oracle, AutoFix) and a **Persistence Layer** (Git Repo, Memory File, Oracle Store). It features an autonomous maintenance loop: a **Heartbeat** service monitors inactivity to trigger **Quiet Reflection** (Oracle analysis), which performs deep project scans (up to 15 levels) to identify architectural drift. These "Prophecies" are visualized in a branded React-based Dashboard via a local Express API and can be resolved via the **AutoFixService**, which manages isolated Git branches and AI-driven refactoring.

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
- **Hardened system for fresh repositories and missing diagrams (05.02.2026):** Implemented graceful handling for repositories with zero commits and missing `DIAGRAM.md` files. The CLI, Watcher, and Oracle now skip analysis or adjust prompts instead of throwing errors when encountering "Day Zero" states.
- **Integrated official branding and asset type safety (05.02.2026):** Replaced generic dashboard icons with the VibeGuard shield logo and implemented TypeScript declarations for image assets to ensure build-time safety for static resources.
- **Standardized CLI distribution and naming (05.02.2026):** Migrated the official npm package to `@getvibeguard/cli`, unified command-line triggers under the `vibeguard` namespace, and optimized the package manifest to include essential documentation for distribution.
- **Refactored Architectural Diagram for Modular Clarity (05.02.2026):** Overhauled `DIAGRAM.md` to reflect the internal "Librarian Module" service boundaries and updated entity naming (e.g., `MemFile`, `OracleStore`) for better alignment with the codebase and data flow logic.
- **Bumped Project Version to v1.1.0 (24.01.2026):** Formalized the first minor release of the VibeGuard CLI, consolidating the autonomous maintenance loop, Oracle drift detection, and the premium dashboard into a stable distribution.
- **Streamlined CLI Boot Sequence (20.01.2026):** Refactored the `init` command to remove legacy ASCII branding and redundant variable declarations, prioritizing a leaner and faster initialization experience.
- **Refactored Dashboard UI to Bento Grid and Premium Design System (19.01.2026):** Overhauled the visual interface with a modular bento-grid layout and a sophisticated "Librarian/Oracle" aesthetic. Introduced noise textures, ambient mesh gradients, and a unified `vg-` Tailwind prefix. Enhanced Mermaid.js integration with a premium dark theme and fullscreen support, and implemented specialized markdown parsing for memory sections.
- **Standardized Architectural Scan Depth and Token Defaults (18.01.2026):** Centralized configuration for directory traversal depth (set to 15) and increased default LLM token limits to 50,000. This synchronizes the Skeleton Scan and Oracle Service for consistent architectural inference across the pipeline.
- **Optimized Dashboard Reactivity and Polling (18.01.2026):** Implemented deep-comparison logic and state-change guards in data-fetching hooks to prevent unnecessary React re-renders during the 10-second polling cycle unless prophecy data or watcher status has materially changed.
- **Expanded Oracle Reasoning Capacity (18.01.2026):** Increased the token limit for Gemini 3 Pro architectural analysis to 50k tokens to enable processing of complex "prophecies" and deep-scan insights without truncation.
- **Expanded LLM Output Limits for Summarization (18.01.2026):** Increased `maxTokens` to 10,000 for Mermaid generation and summary extraction to handle large file contexts and complex diagrams.
- **Rebranded Dashboard to VibeGuard Visual Identity (18.01.2026):** Migrated from generic cyberpunk styling to a specialized design system featuring Electric Indigo, Vibrant Violet, glassmorphism, and glow effects.
- **Expanded Documentation for Autonomous Features (18.01.2026):** Updated README and project structure to reflect the addition of Oracle, AutoFix, and Heartbeat services. Formalized configuration schemas for Gemini token limits and global config paths.
- **Fully Integrated Autonomous Maintenance Loop (18.01.2026):** Connected Heartbeat and AutoFix services to the main watcher lifecycle. The system triggers "Quiet Reflection" via the Oracle after 10 minutes of idle time.
- **Finalized OracleService Implementation for Architectural Drift Detection (18.01.2026):** Completed core logic for the Oracle, performing deep project scans (15-level depth) using Gemini 3 Pro to identify "prophecies" (Refactor, RuleViolation, Optimization). Implemented state persistence in `.vibeguard/oracle.json`.

## Legacy Decisions
- **Core Infrastructure & Stability (14.01.2026 - 17.01.2026):** Established the initial web dashboard, Pulse feed components, and dual-model LLM strategy (Flash/Pro). Hardened watcher stability against race conditions, implemented range-based diffing, and decoupled memory files from version control. Formalized Cursor protocols and externalized memory compaction.
- **Refactored LLM Configuration and Caching (17.01.2026):** Migrated to explicit model configurations and implemented an instance cache.

## Active Tech Debt
- **AutoFix Validation:** Need to implement "Pre-Commit Validation" (e.g., `npm run build` or `tsc`) within AutoFixService to ensure AI fixes don't introduce syntax errors.
- **Conflict Resolution:** AI-driven merge logic for `PROJECT_MEMORY.md` requires hardening for complex branch rebase scenarios.
- **MCP Search Tool:** Need a targeted "Search" tool for context retrieval in massive projects where memory exceeds token limits.
- **Watcher Robustness:** Monitoring of `.git/HEAD` may miss triggers during specific complex rebases.

## Pinned Files
- PROJECT_MEMORY.md
- DIAGRAM.md
- package.json
- src/dashboard/package.json
- .cursor/rules/ (All .mdc files)