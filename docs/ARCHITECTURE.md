# System Architecture Specification (docs/ARCHITECTURE.md)

## 1. Component Topology
The application is structured as a self-hosted monorepo divided into:
- **FastAPI Web API Gateway:** Routes HTTP requests, validates auth tokens, handles websocket streams, and publishes jobs to the Redis queue.
- **CrewAI Worker Process:** Consumes runs from Redis queue, instantiates agent roles, executes tasks, and saves checkpoints.
- **Background Worker Processes:** Dedicated queues for Whisper transcription (STT) and Coqui text-to-speech (TTS).
- **Redis Event Bus:** Event streams coordinating communications between API layers and background task runners.
- **Tri-Store Memory:** Postgres relational tables (Supabase) + local ChromaDB vector records + Postgres-backed Knowledge Graph tables.

## 2. Agent Collaboration Flow
Collaboration follows a manager-worker architecture:
```
   [User Objective]
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

## 3. Swarm Run Lifecycle
- **Queued:** User launches objective. Swarm run ID generated and posted to `swarm_queue` stream in Redis.
- **Running:** Worker pulls run. Instantiates crew and registers state tracker. Calls Orchestrator.
- **Completed/Failed:** Output is synthesized, reports written to disk, and status finalized in database.

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
