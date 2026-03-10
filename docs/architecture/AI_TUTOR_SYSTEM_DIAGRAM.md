# EduSync AI Tutor — Full Architecture Map

This document provides a visual representation of the complete pipeline for the EduSync AI Tutor, from the moment a student asks a question to the generation of the pedagogical response and the subsequent asynchronous knowledge updates.

## System Pipeline Diagram

```mermaid
flowchart TD
    %% Styling Definitions
    classDef user fill:#3b82f6,stroke:#1d4ed8,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef edge fill:#10b981,stroke:#047857,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef db fill:#f59e0b,stroke:#b45309,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef llm fill:#8b5cf6,stroke:#5b21b6,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef ext fill:#64748b,stroke:#334155,stroke-width:2px,color:#fff,rx:8px,ry:8px
    classDef logic fill:#f1f5f9,stroke:#94a3b8,stroke-width:1px,color:#0f172a,rx:4px,ry:4px

    %% Subgraphs
    subgraph ClientLayer [Client Layer]
        A[Student Question]:::user
        Response[AI Tutor Response]:::user
    end

    subgraph EdgeFunction [Supabase Edge Function: ai-tutor]
        direction TB

        %% Cache & Quick Responses
        CacheCheck{"1. Semantic Cache\nLookup (>0.93)"}:::logic
        CacheHit[Return Cached Answer]:::logic

        %% SKM
        FetchSKM["2. Fetch Student\nKnowledge Mastery"]:::logic

        %% Pre-processing
        ConceptExt["3. Heuristic / LLM\nConcept Extraction"]:::logic
        GetEmb["4. Fetch Query\nEmbedding"]:::logic

        %% RAG & Context
        RPC["5. Concept-Aware\nRetrieval RPC"]:::logic
        Packing["6. Token-Aware\nContext Packing"]:::logic

        %% Reasoning
        Pedagogy["7. Pedagogical\nReasoning Engine\n(Determine Strategy)"]:::logic
        Prompt["8. Adaptive Prompt Builder\n(Inject Mastery & Strategy)"]:::logic

        %% Execution
        StreamAPI{"9. LLM Streaming\nAPI Call"}:::logic

        %% Pipeline Flow within Edge
        CacheCheck -- Hit (~80ms) --> CacheHit
        CacheCheck -- Miss --> FetchSKM
        
        FetchSKM --> ConceptExt
        FetchSKM --> GetEmb
        
        ConceptExt & GetEmb --> RPC
        RPC --> Packing
        Packing --> Pedagogy
        Pedagogy --> Prompt
        Prompt --> StreamAPI
    end

    subgraph DataLayer [Supabase Database]
        CacheDB[(ai_tutor_cache)]:::db
        SKMDB[(student_concept_mastery)]:::db
        VectorDB[(lesson_resource_chunks\npgvector)]:::db
        InteractionLog[(ai_tutor_interactions)]:::db
    end

    subgraph AsyncWorkers [Async Updates / Background]
        AsyncCache["Update Cache"]:::logic
        AsyncSKM["Update Mastery\nScores"]:::logic
        AsyncLog["Log Interaction"]:::logic
    end

    subgraph ExternalAPIs [External APIs]
        EmbAPI[Google text-embedding-004]:::ext
        Gemini[Gemini Flash / Pro]:::llm
    end

    %% Connections
    A --> EdgeFunction
    
    %% Edge to DB connections
    CacheCheck -.-> CacheDB
    FetchSKM -.-> SKMDB
    RPC -.-> VectorDB
    
    %% Edge to Ext APIs
    GetEmb -.-> EmbAPI
    StreamAPI -.-> Gemini
    
    %% Output
    StreamAPI -->|Streaming Delta| Response
    CacheHit --> Response
    
    %% Async Flow
    StreamAPI -->|On Complete| AsyncWorkers
    AsyncWorkers -.-> CacheDB
    AsyncWorkers -.-> SKMDB
    AsyncWorkers -.-> InteractionLog
```

## Component Breakdown

1. **Semantic Cache Layer**: The fastest path to an answer. Checks if an identical conceptual question has been asked before.
2. **Student Knowledge Model (SKM)**: Fetches the student's mastery profile to adapt the explanation complexity.
3. **Concept & Embedding Extraction**: Converts the question into mathematical vectors and extracts core concepts (either via simple heuristics or a fast LLM).
4. **Concept-Aware Retrieval**: Queries `pgvector` combining cosine distance with proximity and concept boosts.
5. **Token-Aware Packing**: Safely fits retrieved chunks into a strict context window budget to avoid hallucination and API limits.
6. **Pedagogical Layer**: Rules engine that decides the teaching strategy (e.g., hinted analogy vs direct step-by-step breakdown).
7. **Adaptive LLM Generation**: Combines all previous context into a final system prompt and streams the response back to the client for low TTFB.
8. **Async Observers**: Logs data, updates mastery, and populates the semantic cache in the background without blocking the user.
