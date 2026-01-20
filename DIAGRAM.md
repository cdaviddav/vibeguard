# VibeGuard Architecture Diagram

```mermaid
flowchart TD
    %% Define Styles
    classDef ExternalServices fill:#e1f5fe,stroke:#01579b,stroke-width:2px,color:#000
    classDef InternalLogic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px,color:#000
    classDef PersistenceFiles fill:#fff8e1,stroke:#f57f17,stroke-width:2px,color:#000

    %% External Entities
    subgraph External [External Ecosystem]
        direction TB
        Dev((Developer))
        IDE[IDE / Cursor AI]
        Gemini[Google Gemini API<br/>Flash & Pro Models]
    end

    %% Persistence Layer (File System)
    subgraph Storage [Persistence Layer]
        FS[File System / Git Repo]
        ProjMem[PROJECT_MEMORY.md<br/>Single Source of Truth]
        OracleState[.vibeguard/oracle.json<br/>Prophecy State]
    end

    %% VibeGuard Core System
    subgraph VibeGuard [VibeGuard Core Logic]
        direction TB
        
        %% Entry Points
        CLI[CLI Commands<br/>init / dashboard]
        MCP[MCP Server]
        
        %% Watcher Pipeline
        Watcher[Git Watcher<br/>chokidar]
        DiffEngine[Diff Cleaner &<br/>Chunker]
        
        %% Librarian Services
        Heartbeat[Heartbeat Service<br/>Idle Detection]
        Oracle[Oracle Service<br/>Deep Scan & Reasoning]
        Summarizer[Summarizer<br/>Context Compression]
        MemManager[Memory Manager<br/>Atomic Writes]
        AutoFix[AutoFix Service<br/>Branch Management]
        
        %% Dashboard
        DashAPI[Dashboard API<br/>Express]
        DashUI[Dashboard UI<br/>React / Vite]
    end

    %% Relationships & Data Flow

    %% User / IDE Interactions
    Dev -- Invokes --> CLI
    Dev -- Views --> DashUI
    IDE -- Connects via MCP --> MCP
    MCP -- Reads Context --> ProjMem

    %% Watcher Flow
    FS -- File Changes --> Watcher
    Watcher -- Raw Diffs --> DiffEngine
    DiffEngine -- Cleaned Chunks --> Summarizer
    Summarizer -- Inference Request --> Gemini
    Gemini -- Summary --> Summarizer
    Summarizer -- Update Payload --> MemManager
    MemManager -- Atomic Write --> ProjMem

    %% Autonomous Loop (Heartbeat & Oracle)
    Watcher -- Status Updates --> Heartbeat
    Heartbeat -- Trigger Idle (10m) --> Oracle
    Oracle -- Deep Scan (Depth 15) --> FS
    Oracle -- Architectural Analysis --> Gemini
    Gemini -- Prophecies --> Oracle
    Oracle -- Persist State --> OracleState

    %% AutoFix Flow
    DashUI -- Trigger Fix --> DashAPI
    DashAPI -- Request --> AutoFix
    AutoFix -- Read Prophecy --> OracleState
    AutoFix -- Generate Code --> Gemini
    AutoFix -- Create Branch/Commit --> FS

    %% Dashboard Data Flow
    DashUI -- Polls (usePulse) --> DashAPI
    DashAPI -- Reads --> ProjMem
    DashAPI -- Reads --> OracleState

    %% Apply Styles
    class IDE,Gemini ExternalServices
    class CLI,MCP,Watcher,DiffEngine,Heartbeat,Oracle,Summarizer,MemManager,AutoFix,DashAPI,DashUI InternalLogic
    class FS,ProjMem,OracleState PersistenceFiles
```

# Legend

| Symbol / Color | Meaning |
| :--- | :--- |
| **Blue Node** | **External Services** (APIs, IDEs, Users) |
| **Green Node** | **Internal Logic** (VibeGuard Services, Librarian Modules, Dashboard) |
| **Amber Node** | **Persistence Files** (Storage, Memory, Configs) |
| **Solid Arrow** | Direct data flow or function call |
| **Subgraph** | Logical grouping of components |