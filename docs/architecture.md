# System Architecture

## Overview

The Personalized Treatment Recommendation System is a clinical decision-support application that combines patient history with multi-LLM analysis to produce candidate treatment options. It is explicitly **educational/research** — it does not diagnose, prescribe, or replace a qualified clinician.

## Technology Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 13 (App Router), React 18, TypeScript, Tailwind CSS, shadcn/ui |
| API | Next.js Server Routes (TypeScript) |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Auth | Supabase Auth (email/password) with JWT sessions |
| LLM Providers | Google Gemini, OpenAI, Anthropic Claude |
| Retrieval | TF-IDF + semantic embeddings (client-side computation) |
| ML | Patient-history logistic regression classifier (client-side) |

## Architecture Diagram

```mermaid
graph TB
    subgraph Frontend["Frontend (Next.js)"]
        UI[Dashboard UI]
        Auth[Auth Pages]
        PatientMgmt[Patient Management]
        ProblemInput[Problem Input]
        Results[Recommendation Results]
    end

    subgraph API["Next.js API Routes"]
        AuthAPI[Auth API]
        PatientAPI[Patient CRUD API]
        RecAPI[Recommendation API]
        SafetyAPI[Safety API]
        HistoryAPI[History API]
        HealthAPI[Health API]
        ModelAPI[Model Info API]
    end

    subgraph Services["Service Layer"]
        LLMOrch[LLM Orchestrator]
        Context[Context Builder]
        Safety[Safety Engine]
        Ranking[Hybrid Ranking]
        RAG[Evidence Retrieval]
        ML[Patient-History ML]
        Normalize[Response Normalizer]
    end

    subgraph LLM["LLM Providers"]
        Gemini[Google Gemini]
        OpenAI[OpenAI]
        Claude[Anthropic Claude]
    end

    subgraph DB["Supabase"]
        PG[(PostgreSQL)]
        AuthS[Auth Service]
    end

    UI --> AuthAPI
    UI --> PatientAPI
    UI --> RecAPI
    UI --> SafetyAPI
    UI --> HistoryAPI
    UI --> HealthAPI
    UI --> ModelAPI

    AuthAPI --> AuthS
    PatientAPI --> PG
    HistoryAPI --> PG
    RecAPI --> PG

    RecAPI --> Context
    Context --> LLMOrch
    LLMOrch --> Gemini
    LLMOrch --> OpenAI
    LLMOrch --> Claude
    Gemini --> Normalize
    OpenAI --> Normalize
    Claude --> Normalize
    Normalize --> RAG
    Normalize --> ML
    Normalize --> Safety
    RAG --> Ranking
    ML --> Ranking
    Safety --> Ranking
    Ranking --> RecAPI
    RecAPI --> PG
```

## LLM Orchestration Diagram

```mermaid
sequenceDiagram
    participant Client
    participant API as Recommendation API
    participant Orch as LLM Orchestrator
    participant Gemini
    participant OpenAI
    participant Claude
    participant Pipeline as Ranking Pipeline

    Client->>API: POST /recommendations {problem, providers}
    API->>API: Load patient + history
    API->>Orch: Execute(patientContext, providers)

    par Parallel LLM Calls
        Orch->>Gemini: Request(context)
        Orch->>OpenAI: Request(context)
        Orch->>Claude: Request(context)
    end

    Gemini-->>Orch: Response (or error)
    OpenAI-->>Orch: Response (or error)
    Claude-->>Orch: Response (or error)

    Orch->>Orch: Normalize + deduplicate
    Orch-->>API: Candidates + provider status

    API->>Pipeline: Rank(candidates, patient, evidence)
    Pipeline->>Pipeline: Evidence retrieval
    Pipeline->>Pipeline: ML probability
    Pipeline->>Pipeline: Safety check (allergy exclusion)
    Pipeline->>Pipeline: Hybrid scoring
    Pipeline-->>API: Ranked candidates

    API->>API: Persist to database
    API-->>Client: Recommendations + disclaimers
```

## Recommendation Pipeline Diagram

```mermaid
flowchart TD
    A[1. Authenticate] --> B[2. Load Patient]
    B --> C[3. Load History]
    C --> D[4. Receive Problem]
    D --> E[5. Build Context]
    E --> F[6-8. Call LLMs in Parallel]
    F --> G[9. Normalize Responses]
    G --> H[10. Deduplicate Candidates]
    H --> I[11. Calculate Provider Support]
    I --> J[12. Retrieve Evidence RAG]
    J --> K[13. Diagnosis Relevance]
    K --> L[14. Patient Context Relevance]
    L --> M[15. Evidence Quality]
    M --> N[16. Patient-History ML]
    N --> O[17. Safety Checks]
    O --> P{Safe?}
    P -->|Excluded| EXCL[Excluded Candidates]
    P -->|Pass| Q[18. Hybrid Score]
    Q --> R[19. Rank Candidates]
    R --> S[20. Generate Explanations]
    S --> T[21. Persist Recommendation]
    T --> U[22. Return Response]
    EXCL --> U
```

## Database Relationship Diagram

```mermaid
erDiagram
    users ||--o| patients : "owns"
    patients ||--o{ patient_treatment_history : "has"
    patients ||--o{ recommendation_requests : "generates"
    recommendation_requests ||--o{ recommendation_candidates : "contains"
    recommendation_requests ||--o{ recommendation_providers : "tracks"
    recommendation_candidates ||--o{ recommendation_evidence : "cites"

    users {
        uuid id PK
        text email
        text role
        boolean is_active
        timestamptz created_at
        timestamptz updated_at
    }

    patients {
        uuid id PK
        uuid user_id FK
        text name
        integer age
        text gender
        numeric weight_kg
        numeric height_cm
        numeric bmi
        text diagnosis
        text[] symptoms
        text[] allergies
        text[] chronic_conditions
        text[] genetic_disorders
        timestamptz created_at
        timestamptz updated_at
    }

    patient_treatment_history {
        uuid id PK
        uuid patient_id FK
        text treatment_name
        text outcome
        text adverse_reaction
        date started_at
        date ended_at
        text notes
        timestamptz created_at
    }

    recommendation_requests {
        uuid id PK
        uuid patient_id FK
        text problem_text
        text model_version
        timestamptz created_at
    }

    recommendation_candidates {
        uuid id PK
        uuid request_id FK
        text treatment
        integer rank
        numeric final_score
        numeric llm_support_score
        numeric retrieval_score
        numeric diagnosis_relevance_score
        numeric patient_context_score
        numeric evidence_quality_score
        numeric ml_probability
        text safety_status
        boolean review_required
        timestamptz created_at
    }

    recommendation_providers {
        uuid id PK
        uuid request_id FK
        text provider
        text status
        integer latency_ms
        integer input_tokens
        integer output_tokens
        text error_code
        timestamptz created_at
    }

    recommendation_evidence {
        uuid id PK
        uuid candidate_id FK
        text source
        text source_url
        text title
        text condition
        numeric similarity
        text evidence_quality
        timestamptz created_at
    }
```

## Request Lifecycle

```mermaid
flowchart LR
    subgraph Client
        A[User submits problem] --> B[API call]
    end

    subgraph Server
        B --> C[Auth middleware]
        C --> D[Validate input]
        D --> E[Load patient data]
        E --> F[Build context]
        F --> G[Parallel LLM calls]
        G --> H[Normalize + dedup]
        H --> I[Evidence retrieval]
        I --> J[ML probability]
        J --> K[Safety check]
        K --> L[Hybrid ranking]
        L --> M[Persist results]
        M --> N[Return JSON]
    end

    subgraph Database
        E --> DB1[(patients)]
        E --> DB2[(history)]
        M --> DB3[(recommendations)]
    end

    subgraph External
        G --> LLM1[Gemini]
        G --> LLM2[OpenAI]
        G --> LLM3[Claude]
    end

    N --> O[Render results]
    O --> P[Show disclaimers]
```

## Key Design Principles

1. **Safety overrides ranking** — allergy exclusions are hard constraints, never weighted
2. **Honesty about uncertainty** — missing information is `unknown` or `review_required`, never "safe"
3. **Provider transparency** — failures are shown to the user, never hidden or fabricated
4. **Parallel execution** — all enabled LLM providers are queried concurrently
5. **Explainability** — every recommendation includes a reason and score breakdown
6. **No fabrication** — the system never invents evidence, dosages, or safety information
