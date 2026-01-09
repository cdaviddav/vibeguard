# VibeGuard - The Librarian

A context management tool for AI-assisted coding that watches Git history, captures architectural changes, and maintains a persistent `PROJECT_MEMORY.md` using Gemini 3 Flash for summarization.

## Features

- **Git-Aware**: Automatically monitors commits and extracts architectural insights
- **Three-Tier Initialization**: Smart cold-start with oneline sweep, deep context, and skeleton scan
- **High-Density Memory**: Maintains a concise "Single Source of Truth" for AI coding assistants
- **Auto-Staging**: Keeps `PROJECT_MEMORY.md` in sync with your code
- **Conflict Resolution**: Automatically merges Git conflicts using AI

## Installation

```bash
npm install
```

## Configuration

VibeGuard uses a hybrid configuration strategy with priority order:

1. **Environment Variable** (CI/CD, power users):
   ```bash
   export GEMINI_API_KEY=your-api-key
   ```

2. **`.env` File** (Vibe Coding default):
   ```bash
   cp .env.example .env
   # Edit .env and add your GEMINI_API_KEY
   ```

3. **Global Config** (cross-project):
   ```bash
   mkdir -p ~/.config/vibeguard
   echo '{"geminiApiKey": "your-api-key"}' > ~/.config/vibeguard/config.json
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
│   ├── librarian/
│   │   ├── watcher.ts           # Git change detection
│   │   ├── summarizer.ts        # Gemini integration
│   │   ├── memory-manager.ts    # PROJECT_MEMORY.md management
│   │   └── initializer.ts       # Three-tier initialization
│   └── utils/
│       ├── llm.ts              # Gemini API wrapper
│       ├── git.ts              # Git operations
│       ├── config.ts           # Configuration manager
│       ├── diff-cleaner.ts     # Pre-shredder
│       └── chunker.ts          # Large diff handler
├── PROJECT_MEMORY.md           # Generated memory (tracked in Git)
└── .env.example                # Environment template
```

## License

ISC

## Contributing

Contributions welcome! Please open an issue or submit a pull request.

