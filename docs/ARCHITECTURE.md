# System Architecture Specification (docs/ARCHITECTURE.md)

## 1. Component Topology
The **Nexus** application is structured as a self-hosted monorepo divided into:
- **React Frontend (Vite):** A dark-themed, highly animated SPA dashboard built with React, Tailwind CSS, Framer Motion, and Zustand for state management.
- **FastAPI Web API Gateway:** Routes HTTP requests, validates Firebase auth tokens, manages Server-Sent Events (SSE) streams for live updates, and publishes jobs to the Redis queue.
- **CrewAI Worker Process:** Consumes runs from the Redis queue, instantiates agent roles, executes tasks, and triggers the Human-in-the-Loop approval gate.
- **Terminal CLI Support:** The `nexsus.ps1` PowerShell module allows command-line control of the backend, launching swarms and inspecting live logs natively from terminal environments.
- **Redis Event Bus:** Event streams coordinating communications between API layers and background task runners.
- **Tri-Store Memory:** Postgres relational tables (Supabase) + local ChromaDB vector records + Postgres-backed Knowledge Graph tables.

## 2. Agent Collaboration Flow
Collaboration follows a hierarchical manager-worker architecture:
```text
   [User Objective / CLI Input]
          │
          ▼
   ┌──────────────┐
   │ Orchestrator │ (Manager) Decomposes goal into ordered TaskPlan
   └──────┬───────┘
          │
          ├──────────────► [Planner] (Enriches Plan with Memory Context)
          │
          ├──────────────► [Retriever] (Fetches Web/Database Info)
          │
          ├──────────────► [Executor] (Executes external tool actions)
          │                                  │
          │                                  ▼ (Approval Gate validation check)
          │
          └──────────────► [Validator] (Critical QA verification)
```

## 3. Deployment Topology (GCP)
Nexus is container-native and designed for Google Cloud Platform:
- **Containers:** The backend and frontend are wrapped in portable Docker images.
- **Cloud Run / Compute:** The stateless API Gateway runs securely on GCP, handling horizontal scaling as demand increases.
- **Decoupled State:** Redis and Postgres are hosted independently (e.g., MemoryStore and Supabase), ensuring that spinning up or tearing down worker nodes does not result in data loss.
- **Secrets Management:** `.env` variables containing sensitive LLM keys and Firebase credentials are provided via GCP Secrets Manager at runtime.

## 4. Tri-Store RAG Architecture
RAG retrieval uses a weighted hybrid combination:
- **Vector Search (60%):** sentence-transformers embeddings mapping queries to ChromaDB.
- **Keyword Search (25%):** PostgreSQL `ts_rank` matching against `tsvector` columns on `memory_events`.
- **Entity Overlap (15%):** spaCy NER matching query entities against candidate database event tags.
- **Fusion:** RAG output aggregates and normalizes results, returning the top 10 most relevant context documents.

## 5. LLM Adapter Failover Sequence
Every agent call routes through the `LLMAdapter`:
1. Dispatch to primary model: **Gemini 1.5 Flash** (Google AI Studio).
2. If HTTP 429/5xx received, failover to secondary model: **Groq (llama-3.1-70b)**.
3. If Groq fails, fallback to tertiary: **OpenRouter Free Tier**.
4. In case of 3 successive failures on any single provider, the circuit breaker opens for 30 minutes.
