# 🛡️ VibeGuard

**The Autonomous Architect for the Vibe Coding Era.**

Stop reminding Cursor what you're building. VibeGuard is an AI-powered governance engine that watches your code, maintains your project's "Soul," and proactively alerts you when you drift from your architectural intent.

---

## 🧠 What is VibeGuard?

In the age of AI-driven development, context is everything. But as projects grow, context windows get cluttered, AI becomes forgetful, and architectural drift sets in. VibeGuard solves this by maintaining a stateful, high-density memory of your project. It doesn't just store files; it synthesizes your intent.

### The Three-Tier Engine

- **📚 The Librarian**: Watches your Git commits and automatically synthesizes changes into `PROJECT_MEMORY.md`. It prunes noise and keeps the most important architectural decisions front-and-center.
- **🔮 The Oracle**: Proactively scans for "Drift." It identifies when new code violates your core rules or tech-stack constraints before you even open a PR.
- **🎨 The Visual Soul**: Generates and maintains a real-time `DIAGRAM.md` using Mermaid, ensuring you always have a "Skeleton View" of your system.

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| **Atomic Memory** | High-density context management that saves up to 80% on token usage. |
| **Drift Detection** | Proactive alerts when your code deviates from the project's "Soul." |
| **Auto-Fix** | One-click branch generation and refactoring to realign with architectural rules. |
| **Visual Architecture** | Auto-generated Mermaid diagrams that evolve with every commit. |
| **Token Analytics** | Real-time dashboard showing your AI spend vs. savings using smart model routing. |
| **Universal LLM** | Use your own keys. Supports Gemini 3, GPT-5, and Claude 4.5. |

---

## 🚀 Quick Start

Get VibeGuard up and running in your project in under 60 seconds.

### 1. Install the CLI

```bash
npm install -g @getvibeguard/cli
```

### 2. Initialize Your Project

Run the setup wizard in your project root. This will configure your API keys, model profiles, and generate your custom Cursor `.mdc` rules.

```bash
vibeguard init
```

### 3. Start the Watcher

VibeGuard will now monitor your changes and manage your project memory in the background.

```bash
vibeguard watch
```

---

## 📋 Commands Reference

VibeGuard provides a comprehensive CLI for managing your project's context and architecture.

| Command | Description |
|---------|-------------|
| `vibeguard init` | Run the interactive setup wizard to configure API keys, select your LLM provider (Google/OpenAI/Anthropic), choose a model profile (Economy/Balanced/High-IQ), and generate custom Cursor `.mdc` rules. Also creates `PROJECT_MEMORY.md` with your project's "Soul" description. |
| `vibeguard watch` | Start the background watcher that monitors Git commits and automatically updates `PROJECT_MEMORY.md`. The watcher also runs the Oracle service for drift detection and tracks token usage. Press Ctrl+C to stop. |
| `vibeguard sync` | Manually process the latest commit(s) and update project memory. Useful for one-off synchronization without starting the watcher. |
| `vibeguard sync --deep` | Process the full Git history (up to 1000 commits) to build comprehensive project memory from scratch. Use this for initial setup on existing projects. |
| `vibeguard check` | Run a health check that validates your environment setup, API key validity, Git repository status, and `PROJECT_MEMORY.md` existence. Displays a status report with colored indicators. |
| `vibeguard visualize` | Generate or regenerate the architecture diagram (`DIAGRAM.md`) using Mermaid.js. Scans your `src/` directory and uses AI to create a visual representation of your project structure with color-coded components. |
| `vibeguard dashboard` | Start the local web dashboard server (default port 3000). Provides interactive views for "The Soul" (PROJECT_MEMORY.md), "The Map" (DIAGRAM.md), and "The Pulse" (token analytics and Oracle insights). Opens automatically in your browser. |

### Command Examples

```bash
# First-time setup
vibeguard init

# Start continuous monitoring
vibeguard watch

# One-time sync of latest changes
vibeguard sync

# Build memory from entire project history
vibeguard sync --deep

# Verify everything is working
vibeguard check

# Generate architecture diagram
vibeguard visualize

# Open dashboard to view insights
vibeguard dashboard
```

---

## 🛠️ How it Works

VibeGuard operates as a "Shadow Architect" alongside your IDE (Cursor/VS Code):

1. **The Hook**: Every time you commit or save, the Watcher captures the diff.
2. **The Synthesis**: The Librarian uses a "Flash" model to update the `PROJECT_MEMORY.md`, ensuring the AI always has the latest "state."
3. **The Governance**: When you start a new feature, the Oracle (using `.mdc` rules) forces the AI to check the Memory and Diagram before writing a single line of code.
4. **The Dashboard**: Monitor your project's health, architectural map, and token savings via the local VibeGuard Dashboard.

---

## 📉 Token Economics

VibeGuard is built to be "Financially Intelligent." By intelligently routing background tasks (like summarization) to Gemini Flash or GPT-Mini and reserving "Pro" models for complex reasoning, VibeGuard effectively pays for itself.

---

## 🤝 Community & Feedback

VibeGuard is in Open Beta. We move fast and break things—help us fix them.

- **Discord**: [Join the VibeGuard Tribe](https://discord.gg/Kkmx2V3X) (Real-time support & Vibe checks)
- **GitHub Issues**: [Found a bug?](https://github.com/cdaviddav/vibeguard/issues) Open an issue.

---

## ❓ Troubleshooting & FAQ

### "API Key Not Found" or Authentication Errors

VibeGuard stores keys globally in `~/.vibeguard/config.json`.

**Fix**: Run `vibeguard init --reconfigure` to re-enter your keys.

**Pro-Tip**: If you prefer environment variables, VibeGuard will prioritize `GOOGLE_API_KEY`, `OPENAI_API_KEY`, or `ANTHROPIC_API_KEY` if they are set in your shell.

### Mermaid Diagrams are not rendering

If `DIAGRAM.md` shows raw text instead of a chart:

- **VS Code**: Ensure you have the [Markdown Preview Mermaid Support](https://marketplace.visualstudio.com/items?itemName=bierner.markdown-mermaid) extension installed.
- **Cursor**: The built-in preview supports Mermaid by default. If it fails, check for syntax errors at the top of the file—VibeGuard usually auto-fixes these on the next `visualize` run.

### High Token Usage / Costs

If your "Pulse" dashboard shows a spike in spend:

- **Check your Profile**: You may be on "High-IQ" mode. Switch to "Balanced" or "Economy" using `vibeguard init` to use Flash models for routine summaries.
- **Large Commits**: Avoid staging massive binary files or `node_modules`. VibeGuard respects `.gitignore`, but heavy text files can still consume tokens.

### "Unknown Command" Errors

If you see `command not found: vibeguard`:

- Ensure you installed it globally: `npm install -g @getvibeguard/cli`.
- If using `npx`, run `npx @getvibeguard/cli <command>`.

---

## ⚖️ License

MIT © 2026 VibeGuard Team.
