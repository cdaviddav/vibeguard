# VibeGuard Architecture Diagram

```mermaid
flowchart TD
    %% ------------------------------
    %% STYLE DEFINITIONS
    %% ------------------------------
    classDef ExternalServices fill:#e1f5fe,stroke:#01579b,stroke-width:2px
    classDef InternalLogic fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    classDef PersistenceFiles fill:#fff8e1,stroke:#f57f17,stroke-width:2px

    %% ------------------------------
    %% EXTERNAL SERVICES
    %% ------------------------------
    subgraph External [External Ecosystem]
        User((Developer))
        IDE[IDE / Cursor]
        Gemini[Gemini 3 API<br/>Flash & Pro]
        DashUI[Dashboard UI<br/>React/Vite]
    end

    %% ------------------------------
    %% INTERNAL LOGIC
    %% ------------------------------
    subgraph Core [VibeGuard Core Logic]
        CLI[CLI / Init]
        MCP[MCP Server]
        
        subgraph Librarian [Librarian Module]
            Watcher[Watcher Service]
            Summarizer[Summarizer<br/>Diff Shredder]
            MemMgr[Memory Manager]
            Heartbeat[Heartbeat Service]
            Oracle[Oracle Service]
            AutoFix[AutoFix Service]
        end
        
        DashAPI[Dashboard API<br/>Express]
    end

    %% ------------------------------
    %% PERSISTENCE LAYER
    %% ------------------------------
    subgraph Storage [Persistence Layer]
        GitRepo[Git Repository<br/>Source Code]
        MemFile[PROJECT_MEMORY.md<br/>Single Source of Truth]
        OracleStore[oracle.json<br/>Prophecy State]
    end

    %% ------------------------------
    %% DATA FLOW CONNECTIONS
    %% ------------------------------
    
    %% User Interactions
    User -- "Runs Commands" --> CLI
    User -- "Views Prophecies" --> DashUI
    IDE -- "MCP Protocol" --> MCP
    
    %% Watcher Pipeline
    GitRepo -- "File Changes" --> Watcher
    Watcher -- "Raw Diffs" --> Summarizer
    Summarizer -- "Request Summary" --> Gemini
    Gemini -- "Contextual Summary" --> Summarizer
    Summarizer -- "Structured Data" --> MemMgr
    MemMgr -- "Atomic Write" --> MemFile
    
    %% Autonomous Maintenance Loop
    Watcher -- "Activity Status" --> Heartbeat
    Heartbeat -- "Idle Trigger (10m)" --> Oracle
    Oracle -- "Deep Scan (Depth 15)" --> GitRepo
    Oracle -- "Architectural Reasoning" --> Gemini
    Oracle -- "Save Prophecies" --> OracleStore
    
    %% Dashboard & AutoFix Flow
    DashUI -- "Polls (usePulse)" --> DashAPI
    DashAPI -- "Reads" --> OracleStore
    DashUI -- "Trigger Fix" --> DashAPI
    DashAPI -- "Invoke" --> AutoFix
    AutoFix -- "Create Branch/Fix" --> GitRepo
    
    %% Context Retrieval
    MCP -- "Get Context" --> MemFile

    %% ------------------------------
    %% APPLY STYLES
    %% ------------------------------
    class External ExternalServices
    class Core InternalLogic
    class Librarian InternalLogic
    class Storage PersistenceFiles
    class GitRepo,MemFile,OracleStore PersistenceFiles
    class User,IDE,Gemini,DashUI ExternalServices
    class CLI,MCP,Watcher,Summarizer,MemMgr,Heartbeat,Oracle,AutoFix,DashAPI InternalLogic
```

# Legend

*   **External Ecosystem (Blue):** Components outside the core Node.js runtime, including the Developer, AI Models, IDEs, and the React Frontend.
*   **VibeGuard Core Logic (Green):** The internal TypeScript services running via Node.js/tsx, handling the business logic, file watching, and API orchestration.
*   **Persistence Layer (Amber):** The file system elements where state is stored, including the Git repository, the generated memory file, and JSON state stores.
*   **Arrows:** Indicate the direction of data flow or control triggers (e.g., "Atomic Write", "Deep Scan").