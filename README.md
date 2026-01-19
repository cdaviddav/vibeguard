# VibeGuard - The Librarian

A context management tool for AI-assisted coding that watches Git history, captures architectural changes, and maintains a persistent `PROJECT_MEMORY.md` using Gemini 3 Flash for summarization.

## Features

- **Git-Aware**: Automatically monitors commits and extracts architectural insights
- **Three-Tier Initialization**: Smart cold-start with oneline sweep, deep context, and skeleton scan
- **High-Density Memory**: Maintains a concise "Single Source of Truth" for AI coding assistants
- **Auto-Staging**: Keeps `PROJECT_MEMORY.md` in sync with your code
- **Conflict Resolution**: Automatically merges Git conflicts using AI
- **MCP Protocol Support**: Native Model Context Protocol (MCP) server for direct integration with Cursor, Claude Desktop, and other AI IDEs
- **Dashboard**: Visual web interface with "The Soul", "The Map", and "The Pulse" views for real-time project insights
- **Oracle**: Architectural drift detection that identifies violations, refactors, and optimizations
- **AutoFix**: AI-powered automatic refactoring engine that creates isolated Git branches for fixes
- **Heartbeat**: Quiet reflection service that triggers oracle analysis during inactivity periods


## AI Assistant Integration
VibeGuard provides an MCP server so your AI can "read" its own memory automatically.

### Connecting to Cursor
1. Go to **Cursor Settings > Features > MCP**.
2. Add a new server:
   - **Name**: VibeGuard
   - **Type**: `command`
   - **Command**: `npx tsx src/mcp-server.ts`



## Installation

```bash
npm install
```

## Configuration

VibeGuard uses a hybrid configuration strategy with priority order:

1. **Environment Variable** (CI/CD, power users):
   ```bash
   export GEMINI_API_KEY=your-api-key
   export VIBEGUARD_MAX_TOKENS=8000  # Optional: max output tokens (default: 30000)
   ```

2. **`.env` File** (Vibe Coding default):
   ```bash
   # Create .env file in project root
   # Add your configuration:
   GEMINI_API_KEY=your-api-key
   VIBEGUARD_MAX_TOKENS=8000
   ```

3. **Global Config** (cross-project):
   ```bash
   mkdir -p ~/.config/vibeguard
   echo '{"geminiApiKey": "your-api-key", "maxTokens": 8000}' > ~/.config/vibeguard/config.json
   ```

### Getting Your Gemini API Key

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Create a new API key
3. Add it to one of the configuration methods above

## Usage

### Initialize (First Time)

Run the three-tier initialization to create `PROJECT_MEMORY.md`:

```bash
npm run dev init
# or after building:
npm run build
node dist/index.js init
```

This will:
- **Tier 1**: Analyze commit history locally (0 tokens)
- **Tier 2**: Process last 5-10 commits with Gemini (mid-cost)
- **Tier 3**: Infer architecture from file structure (high value)

### Watch Mode

Start watching for new commits:

```bash
npm run dev watch
```

The watcher will:
- Monitor `.git/HEAD` and `.git/index` for changes
- Process new commits automatically
- Update `PROJECT_MEMORY.md` and stage it in Git

### Manual Sync

Process the latest commit(s) manually:

```bash
npm run dev sync
```

### Deep Sync

Process full Git history (token-intensive):

```bash
npm run dev sync --deep
```

### Dashboard

Launch the visual web interface:

```bash
npm run dev dashboard
```

The dashboard provides three views:
- **The Soul**: View and browse `PROJECT_MEMORY.md` content
- **The Map**: Visualize architecture with interactive Mermaid diagrams
- **The Pulse**: Monitor watcher status and Oracle prophecies in real-time

Build the dashboard for production:

```bash
npm run build:dashboard
```

## PROJECT_MEMORY.md Schema

The generated `PROJECT_MEMORY.md` follows this structure:

```markdown
## Project Soul
A 2-sentence description of what this app is and who it's for.

## Tech Stack
A list of core libraries, frameworks, and versions.

## Architecture
High-level overview of how data flows.

## Core Rules
Critical "Vibe" rules that must be followed.

## Recent Decisions (The "Why")
Document the last 5 major changes and *why* they happened.

## Active Tech Debt
Known bugs or "next steps" that the AI should be aware of.
```

## How It Works

1. **Pre-Shredder**: Cleans diffs by removing bloat (lockfiles, node_modules, build outputs)
2. **Chunking**: Handles large diffs by splitting into manageable pieces
3. **The Librarian**: Uses Gemini 3 Flash with specialized prompts to extract architectural insights
4. **Atomic Writes**: Prevents file corruption using `write-file-atomic`
5. **Auto-Staging**: Keeps memory file in sync with code changes

## Development

```bash
# Build
npm run build

# Run in development mode
npm run dev <command>

# Run built version
npm start <command>
```

## Project Structure

```
vibeguard/
├── src/
│   ├── index.ts                 # CLI entry point
│   ├── mcp-server.ts            # MCP server for Cursor integration
│   ├── commands/
│   │   └── dashboard.ts         # Dashboard Express server
│   ├── librarian/
│   │   ├── watcher.ts           # Git change detection
│   │   ├── summarizer.ts        # Gemini integration
│   │   ├── memory-manager.ts    # PROJECT_MEMORY.md management
│   │   ├── initializer.ts       # Three-tier initialization
│   │   ├── oracle.ts            # Architectural drift detection
│   │   ├── autofix.ts           # AI-powered refactoring engine
│   │   └── heartbeat.ts         # Quiet reflection service
│   ├── dashboard/               # React/Vite dashboard application
│   │   ├── src/
│   │   │   ├── components/      # React components (TheSoul, TheMap, ThePulse, etc.)
│   │   │   ├── hooks/           # React hooks (usePulse)
│   │   │   └── App.tsx          # Dashboard entry point
│   │   └── package.json         # Dashboard dependencies
│   ├── utils/
│   │   ├── llm.ts              # Gemini API wrapper
│   │   ├── git.ts              # Git operations
│   │   ├── config.ts           # Configuration manager
│   │   ├── diff-cleaner.ts     # Pre-shredder
│   │   └── chunker.ts          # Large diff handler
│   └── types/
│       └── write-file-atomic.d.ts
├── scripts/
│   └── copy-dashboard.js       # Build script for dashboard deployment
├── PROJECT_MEMORY.md           # Generated memory (git-ignored)
├── DIAGRAM.md                  # Generated architecture diagram
└── .env                        # Environment configuration (git-ignored)
```

## License

ISC

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

