# VibeGuard Architecture Diagram

```mermaid
flowchart TD
    subgraph ExternalServicesGroup [External Services]
        GeminiAPI[Gemini 3 Flash API]
        IDE[AI-Driven IDE / Cursor]
        GitCLI[Git CLI / System]
    end

    subgraph InternalLogicGroup [Internal Logic]
        CLI[CLI Entry - index.ts]
        MCPServer[MCP Server]
        Watcher[Git Watcher]
        Cleaner[Diff Pre-shredder]
        Summarizer[LLM Summarizer]
        MemManager[Memory Manager]
        Visualizer[Visual Soul Engine]
    end

    subgraph PersistenceGroup [Persistence & Files]
        ProjMem[PROJECT_MEMORY.md]
        DiagFile[DIAGRAM.md]
        PinnedFiles[Pinned Files - package.json/config]
        GitRepo[(Git History & Diffs)]
    end

    %% Pipeline Flow
    GitRepo -- Triggers --> Watcher
    Watcher -- Raw Diffs --> Cleaner
    Cleaner -- Cleaned Diffs --> Summarizer
    Summarizer -- Request Intent --> GeminiAPI
    GeminiAPI -- Intent Summary --> Summarizer
    Summarizer -- Extracted Intent --> MemManager
    MemManager -- Atomic Write --> ProjMem

    %% MCP Interaction
    IDE -- get_core_context --> MCPServer
    IDE -- update_project_memory --> MCPServer
    MCPServer -- Reads --> ProjMem
    MCPServer -- Reads --> DiagFile
    MCPServer -- Reads --> PinnedFiles
    MCPServer -- Section Appending --> MemManager

    %% CLI & Visualization
    CLI -- vibeguard visualize --> Visualizer
    Visualizer -- Scan src/ --> GeminiAPI
    Visualizer -- Generate --> DiagFile
    CLI -- Trigger Manual Sync --> Watcher

    %% Styling
    classDef ExternalServices fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef InternalLogic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef PersistenceFiles fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    class ExternalServicesGroup ExternalServices
    class InternalLogicGroup InternalLogic
    class ProjMem,DiagFile,PinnedFiles,GitRepo PersistenceFiles
```

## Legend

| Symbol | Meaning | Color |
| :--- | :--- | :--- |
| **Blue Box** | **External Services** | Third-party APIs, IDEs, and system-level tools (Gemini, Git). |
| **Green Box** | **Internal Logic** | Core VibeGuard TypeScript components and processing pipeline. |
| **Amber Box** | **Persistence & Files** | Data storage layer, including the Single Source of Truth and configuration. |
| **Solid Arrow** | **Data Flow** | Direction of information transfer or tool invocation. |
| **Cylinder** | **Database/History** | Represents versioned state or historical data (Git). |