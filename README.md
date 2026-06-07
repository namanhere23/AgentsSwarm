<p align="center">
  <strong>NexusSentry v3.1</strong><br>
  Multi-Agent AI Command Center
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white" />
  <img src="https://img.shields.io/badge/React-61DAFB?style=for-the-badge&logo=react&logoColor=black" />
  <img src="https://img.shields.io/badge/CrewAI-FF6B6B?style=for-the-badge" />
  <img src="https://img.shields.io/badge/Redis-DC382D?style=for-the-badge&logo=redis&logoColor=white" />
  <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=for-the-badge&logo=postgresql&logoColor=white" />
  <img src="https://img.shields.io/badge/Docker-2496ED?style=for-the-badge&logo=docker&logoColor=white" />
</p>

---

**NexusSentry** is a self-hosted, general-purpose **multi-agent operating system** that orchestrates collaborative AI crews — composed of Scout, Architect, Builder, QA Verifier, Critic, and Integrator agents — to solve complex, multi-step objectives using zero-cost free-tier LLM APIs. It features real-time execution tracing, human-in-the-loop approval gates, persistent dual-memory (keyword + vector), and a full observability dashboard.

---

## Table of Contents

- [Features](#features)
- [Architecture](#architecture)
- [Agent Topology](#agent-topology)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [API Reference](#api-reference)
- [Frontend Dashboard](#frontend-dashboard)
- [Crew Configuration](#crew-configuration)
- [Memory System](#memory-system)
- [Security](#security)
- [Documentation](#documentation)

---

## Features

| Feature | Description |
|---|---|
| **Multi-Agent Orchestration** | Hierarchical CrewAI crews with specialized roles (Scout → Architect → Builder → QA → Critic → Integrator) |
| **Human-in-the-Loop** | Approval gates for risky operations — HTTP calls, code execution, and file writes require explicit user approval |
| **Real-Time Trace** | WebSocket-powered live trace view showing agent decisions, tool calls, and task progress as they happen |
| **Dual Memory System** | Supabase full-text keyword search (`tsvector`) + ChromaDB vector embeddings for semantic RAG retrieval |
| **Knowledge Graph** | Auto-extracted entity-relationship graph with NER pipeline across all memory events |
| **Voice Interface** | Whisper STT for voice-to-swarm input + ElevenLabs TTS for audio output |
| **YAML-Driven Crews** | Declarative agent topologies — add new crews without writing code, hot-reloaded at runtime |
| **Multi-LLM Routing** | Gemini 1.5 Flash, Groq Llama 3.1 70B, OpenRouter fallback — all free-tier compatible |
| **Scheduled Runs** | Cron-based and one-shot scheduled swarm executions via APScheduler |
| **Audit Trail** | Every action logged with timestamps, user IDs, and risk levels for full compliance |
| **Circuit Breaker** | Automatic circuit breaking for external API failures with configurable thresholds |
| **Rate Limiting** | Redis-based per-user rate limiting with YAML-configurable limits |
| **Rollback Manager** | Automatic rollback of failed executor actions |
| **Auto Briefings** | High-priority runs (score ≥ 0.80) auto-generate executive briefing summaries |
| **Docker Compose** | Full-stack deployment with one command — API, workers, frontend, Postgres, Redis, ChromaDB |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                      │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Swarm   │ │  Live    │ │ Approval │ │    Memory        │   │
│  │ Launcher │ │  Trace   │ │  Center  │ │   Explorer       │   │
│  └────┬─────┘ └────┬─────┘ └────┬─────┘ └────┬─────────────┘   │
│       │  HTTP/WS   │            │             │                 │
└───────┼────────────┼────────────┼─────────────┼─────────────────┘
        │            │            │             │
┌───────▼────────────▼────────────▼─────────────▼─────────────────┐
│                     BACKEND (FastAPI)                            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │  Routes  │ │ Security │ │ Services │ │   Core Infra     │   │
│  │  (REST)  │ │  (JWT)   │ │  Layer   │ │  (EventBus etc)  │   │
│  └────┬─────┘ └──────────┘ └────┬─────┘ └──────────────────┘   │
│       │                         │                               │
└───────┼─────────────────────────┼───────────────────────────────┘
        │                         │
   ┌────▼─────┐            ┌──────▼──────┐
   │  Redis   │◄───────────│   Workers   │
   │ Streams  │            │ (Consumers) │
   └────┬─────┘            └──────┬──────┘
        │                         │
        │                  ┌──────▼──────┐
        │                  │   CrewAI    │
        │                  │   Agents    │
        │                  └──────┬──────┘
        │                         │
   ┌────▼─────┐  ┌─────────┐  ┌──▼───────┐
   │ Supabase │  │ ChromaDB│  │ External │
   │ Postgres │  │ Vectors │  │   APIs   │
   └──────────┘  └─────────┘  └──────────┘
```

### Data Flow

1. **User** submits a natural-language objective via the dashboard
2. **API** inserts a `swarm_run` record (status: `queued`) into Supabase and publishes a job to Redis Streams
3. **Crew Worker** consumes the job, resolves the crew YAML definition, and calls `execute_crew()`
4. **CrewAI Engine** runs agents in hierarchical mode — Orchestrator delegates to Planner → Retriever → Executor → Validator
5. **Real-time events** (`SWARM_STARTED`, `TASK_STARTED`, `TASK_COMPLETED`, `SWARM_COMPLETED`) are published to Redis and pushed to the frontend via WebSocket
6. **Approval Gate** pauses execution for high/medium-risk actions and waits for user approval via the Approval Center
7. On completion, a **Markdown report** is generated and optionally a **briefing** is enqueued for high-priority runs

---

## Agent Topology

```
                    ┌──────────────┐
                    │ Orchestrator │  (Gemini 1.5 Flash)
                    │  Decompose   │  Breaks goals into TaskPlan
                    │  & Delegate  │  Never executes directly
                    └──────┬───────┘
                           │ delegates to
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
   ┌──────────┐    ┌──────────┐    ┌──────────┐
   │ Planner  │    │Retriever │    │ Executor │
   │  Plan &  │    │  Search  │    │  Act &   │
   │ Enrich   │    │ & Fetch  │    │ Execute  │
   └──────────┘    └──────────┘    └──────────┘
   Gemini Flash    Groq Llama 70B  Groq Llama 70B
                                         │
                                   ┌─────▼─────┐
                                   │ Validator  │
                                   │  QA Check  │
                                   │  & Verify  │
                                   └────────────┘
                                   Gemini Flash
```

| Agent | Role | LLM | Tools |
|---|---|---|---|
| **Orchestrator** | Decomposes objectives, delegates tasks, never executes | Gemini 1.5 Flash | None (delegation only) |
| **Planner** | Enriches task plans with memory context, produces step sequences | Gemini 1.5 Flash | VectorSearch, KeywordSearch |
| **Retriever** | Fetches real-time web data and archival knowledge | Groq Llama 3.1 70B | WebSearch, VectorSearch, KeywordSearch |
| **Executor** | Runs concrete actions through approval gates | Groq Llama 3.1 70B | HttpAction, WebSearch, FileWrite, CodeExecution |
| **Validator** | QA — checks outputs for correctness, consistency, risk flags | Gemini 1.5 Flash | None (analysis only) |

---

## Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Backend API** | FastAPI (Python 3.11+) | REST API + WebSocket server |
| **Agent Framework** | CrewAI | Multi-agent orchestration with hierarchical process |
| **Frontend** | React 18 + TypeScript + Vite | Single-page dashboard application |
| **Styling** | TailwindCSS | Utility-first CSS framework |
| **Database** | PostgreSQL 15 (via Supabase) | Persistent storage with RLS policies |
| **Vector Store** | ChromaDB | Semantic embedding storage for RAG retrieval |
| **Event Bus** | Redis 7 (Streams) | Job queue, pub/sub, rate limiting, concurrency tracking |
| **Auth** | Firebase Authentication | JWT-based user authentication |
| **LLMs** | Gemini 1.5 Flash, Groq Llama 3.1 70B | Zero-cost free-tier AI providers |
| **LLM Fallback** | OpenRouter | Multi-model fallback router |
| **Voice STT** | OpenAI Whisper | Speech-to-text for voice input |
| **Voice TTS** | ElevenLabs | Text-to-speech for audio output |
| **Scheduling** | APScheduler | Cron-based and one-shot scheduled runs |
| **Containerization** | Docker Compose | Full-stack deployment |

---

## Project Structure

```
.
├── backend/
│   ├── main.py                     # FastAPI entry point + lifespan startup
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── app/
│   │   ├── agents/                 # CrewAI agent definitions
│   │   │   ├── orchestrator.py     # Goal decomposition & delegation
│   │   │   ├── planner.py          # Plan enrichment with memory
│   │   │   ├── retriever.py        # Web + vector search
│   │   │   ├── executor.py         # Action execution
│   │   │   ├── validator.py        # QA & validation
│   │   │   ├── replanner.py        # Re-planning on validation failure
│   │   │   ├── semantic_scorer.py  # Output relevance scoring
│   │   │   └── delegation_logger.py
│   │   ├── api/routes/             # REST API endpoints
│   │   │   ├── swarms.py           # Launch, list, cancel runs
│   │   │   ├── swarms_voice.py     # Voice-to-swarm pipeline
│   │   │   ├── websocket.py        # Real-time trace streaming
│   │   │   ├── approvals.py        # Human-in-the-loop gates
│   │   │   ├── memory.py           # Memory CRUD + search
│   │   │   ├── crews.py            # Crew management
│   │   │   ├── audit.py            # Audit log queries
│   │   │   ├── schedules.py        # Scheduled runs
│   │   │   ├── briefings.py        # Auto-briefing summaries
│   │   │   └── health.py           # Infrastructure health checks
│   │   ├── core/                   # Infrastructure layer
│   │   │   ├── config.py           # Pydantic settings from .env
│   │   │   ├── event_bus.py        # Redis Streams pub/sub
│   │   │   ├── crew_registry.py    # YAML crew loader + hot-reload
│   │   │   ├── tool_registry.py    # Tool registration by name
│   │   │   ├── checkpointer.py     # PostgreSQL execution checkpoints
│   │   │   ├── circuit_breaker.py  # External API circuit breaker
│   │   │   ├── blackboard.py       # Inter-agent shared state
│   │   │   ├── provider_router.py  # Multi-LLM provider routing
│   │   │   ├── run_context.py      # Per-run contextual state
│   │   │   ├── security.py         # Firebase JWT verification
│   │   │   ├── supabase_client.py  # Supabase client factory
│   │   │   └── dependencies.py     # FastAPI dependency injection
│   │   ├── memory/                 # Memory subsystem
│   │   │   ├── repository.py       # Supabase CRUD layer
│   │   │   ├── vector_store.py     # ChromaDB embeddings
│   │   │   ├── knowledge_graph.py  # Entity-relationship graph
│   │   │   └── ner_pipeline.py     # Named entity recognition
│   │   ├── models/                 # Pydantic request/response schemas
│   │   ├── services/               # Business logic
│   │   │   ├── crew_executor.py    # Core crew execution engine
│   │   │   ├── llm_adapter.py      # Unified LLM interface
│   │   │   ├── approval_gate.py    # Approval workflow
│   │   │   ├── rate_limiter.py     # Redis rate limiting
│   │   │   ├── scheduler.py        # APScheduler cron/one-shot
│   │   │   ├── smart_dispatcher.py # Intelligent crew selection
│   │   │   ├── pipeline_optimizer.py
│   │   │   ├── rollback_manager.py # Action rollback
│   │   │   ├── watchdog.py         # Stuck task monitor
│   │   │   ├── report_generator.py # Markdown report output
│   │   │   ├── briefing_service.py # Auto executive summaries
│   │   │   ├── decay_service.py    # Memory TTL management
│   │   │   └── priority_service.py # Run priority scoring
│   │   ├── tools/                  # Agent tool SDK
│   │   │   ├── base.py             # Abstract base with sandboxing
│   │   │   ├── web_search_tool.py  # Serper API search
│   │   │   ├── vector_search_tool.py # ChromaDB semantic search
│   │   │   ├── keyword_search_tool.py # Supabase tsvector search
│   │   │   ├── http_action_tool.py # External API calls
│   │   │   ├── file_write_tool.py  # Sandboxed file I/O
│   │   │   └── code_execution_tool.py # Sandboxed Python exec
│   │   ├── security/               # Auth & authorization
│   │   └── utils/                  # Shared utilities
│   └── workers/                    # Background consumers
│       ├── crew_consumer.py        # Redis → CrewAI execution
│       ├── whisper_consumer.py     # Audio → Whisper STT
│       └── tts_consumer.py         # Text → ElevenLabs TTS
│
├── frontend/
│   ├── src/
│   │   ├── main.tsx                # React entry + routing
│   │   ├── index.css               # Global styles
│   │   ├── pages/
│   │   │   ├── Login.tsx           # Firebase authentication
│   │   │   └── dashboard/
│   │   │       ├── SwarmLauncher.tsx    # Goal input + crew selection
│   │   │       ├── LiveTraceView.tsx   # Real-time agent trace
│   │   │       ├── ApprovalCenter.tsx  # Approve/reject actions
│   │   │       ├── MemoryExplorer.tsx  # Memory events browser
│   │   │       ├── CrewManager.tsx     # YAML crew editor
│   │   │       ├── AuditLogView.tsx    # Audit trail viewer
│   │   │       └── SystemStatus.tsx    # Health monitoring
│   │   ├── components/
│   │   │   ├── DashboardLayout.tsx # Sidebar + content layout
│   │   │   ├── RouteGuard.tsx      # Auth-protected routes
│   │   │   ├── AgentTraceCard.tsx  # Individual agent trace card
│   │   │   └── AuthLoadingSpinner.tsx
│   │   ├── stores/                 # Zustand state management
│   │   │   ├── useAuthStore.ts
│   │   │   ├── useSwarmStore.ts
│   │   │   ├── useWebSocketStore.ts
│   │   │   └── useApprovalStore.ts
│   │   ├── services/
│   │   │   └── api.ts              # Axios HTTP client
│   │   ├── hooks/                  # Custom React hooks
│   │   └── types/                  # TypeScript type definitions
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   └── Dockerfile
│
├── crews/
│   └── research-crew.yaml          # Default research crew definition
├── tools/                          # User-created custom tool modules
├── workspace/                      # Sandboxed agent file I/O
├── config/
│   └── rate_limits.yaml            # Rate limiting configuration
├── docs/                           # Technical documentation
├── supabase/                       # Database migrations
├── docker-compose.yml              # Production deployment
├── docker-compose.dev.yml          # Development overrides
└── DESIGN.md                       # UI design system specification
```

---

## Quick Start

### Prerequisites

- Python 3.11+
- Node.js 18+
- Docker & Docker Compose
- API keys for: Firebase, Supabase, Gemini, Serper (all free-tier)

### 1. Clone & Configure

```bash
git clone https://github.com/your-org/agent-swarms.git
cd agent-swarms
cp .env.example .env
# Fill in your API keys in .env
```

### 2. Docker Compose (Recommended)

```bash
# Start all services: API, workers, frontend, Postgres, Redis, ChromaDB
docker-compose up -d

# Frontend at http://localhost:3000
# API at http://localhost:8000
# API docs at http://localhost:8000/docs
```

### 3. Local Development

```bash
# Terminal 1: Infrastructure
docker-compose -f docker-compose.dev.yml up -d  # Postgres + Redis + ChromaDB

# Terminal 2: Backend API
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --port 8000

# Terminal 3: Crew Worker
python -m backend.workers.crew_consumer

# Terminal 4: Frontend
cd frontend && npm install && npm run dev
# Dashboard at http://localhost:5173
```

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | Application secret for signing |
| `FIREBASE_PROJECT_ID` | Yes | Firebase project ID for auth |
| `SUPABASE_JWT_SECRET` | Yes | Supabase JWT verification secret |
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Yes | Supabase service role key |
| `GEMINI_API_KEY` | Yes | Google Gemini API key (free tier) |
| `SERPER_API_KEY` | Yes | Serper web search API key |
| `GROQ_API_KEY` | No | Groq API key for Llama models (free tier) |
| `OPENROUTER_API_KEY` | No | OpenRouter fallback API key |
| `ELEVENLABS_API_KEY` | No | ElevenLabs TTS API key |
| `REDIS_URL` | No | Redis connection URL (default: `redis://localhost:6379`) |
| `CHROMA_HOST` | No | ChromaDB host (default: `localhost`) |
| `CHROMA_PORT` | No | ChromaDB port (default: `8001`) |
| `FRONTEND_ORIGIN` | No | CORS origin (default: `http://localhost:5173`) |
| `MOCK_TOOLS` | No | Enable tool mocking for testing (default: `false`) |

---

## API Reference

Base URL: `http://localhost:8000`

### Swarm Runs

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/swarms/` | Launch a new swarm run with an objective |
| `GET` | `/swarms/` | List all swarm runs for the authenticated user |
| `GET` | `/swarms/{run_id}` | Get details of a specific run |
| `POST` | `/swarms/{run_id}/cancel` | Cancel a running swarm |

### Voice

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/voice/transcribe` | Upload audio → Whisper STT → Launch swarm |

### Approvals

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/approvals/` | List pending approval requests |
| `POST` | `/approvals/{id}/approve` | Approve a pending action |
| `POST` | `/approvals/{id}/reject` | Reject a pending action |

### Memory

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/memory/events` | List memory events |
| `POST` | `/memory/events` | Store a new memory event |
| `GET` | `/memory/entities` | List extracted entities |
| `POST` | `/memory/search/keyword` | Full-text keyword search |
| `POST` | `/memory/search/vector` | Semantic vector similarity search |

### Crews

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/crews/` | List available crew definitions |
| `GET` | `/crews/{crew_id}` | Get a crew's YAML configuration |
| `POST` | `/crews/` | Register a new crew |

### Other

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/health` | Infrastructure health check (Redis, Postgres, ChromaDB) |
| `GET` | `/audit/` | Query audit logs |
| `GET` | `/schedules/` | List scheduled runs |
| `POST` | `/schedules/` | Create a scheduled/cron run |
| `GET` | `/briefings/` | List auto-generated briefings |
| `WS` | `/ws/{run_id}` | WebSocket for real-time trace events |

---

## Frontend Dashboard

| Page | Route | Description |
|---|---|---|
| **Swarm Launcher** | `/dashboard` | Natural language goal input, crew selection, quick-start templates |
| **Live Trace** | `/dashboard/trace/:runId` | Real-time agent execution trace via WebSocket |
| **Approval Center** | `/dashboard/approvals` | Approve or reject pending agent actions |
| **Memory Explorer** | `/dashboard/memory` | Browse memory events, entities, and knowledge graph |
| **Crew Manager** | `/dashboard/crews` | View and edit YAML crew configurations |
| **Audit Log** | `/dashboard/audit` | Searchable audit trail of all system actions |
| **System Status** | `/dashboard/system` | Health monitoring for all infrastructure services |

---

## Crew Configuration

Crews are defined in YAML files under `crews/`. Example:

```yaml
id: "research-crew"
name: "Research Crew"
description: "Multi-agent crew for research and task execution"
process: "hierarchical"
agents:
  - role: "orchestrator"
    backstory: "Senior AI project manager..."
    goal: "Decompose objectives and delegate tasks"
    tools: []
    allow_delegation: true
    llm:
      model: "gemini-1.5-flash"
      temperature: 0.1
      max_tokens: 1024
  - role: "executor"
    backstory: "Precise execution specialist..."
    goal: "Execute planned steps through approval gates"
    tools: ["HttpActionTool", "WebSearchTool", "FileWriteTool", "CodeExecutionTool"]
    allow_delegation: false
    llm:
      model: "groq/llama-3.1-70b-versatile"
      temperature: 0.0
```

Crews are **hot-reloaded** — save a YAML file and the registry picks it up automatically.

---

## Memory System

NexusSentry implements a **three-layer memory architecture**:

| Layer | Technology | Use Case |
|---|---|---|
| **Keyword Search** | Supabase `tsvector` | Fast full-text search across memory events |
| **Vector Search** | ChromaDB embeddings | Semantic similarity retrieval for RAG |
| **Knowledge Graph** | Entity-relationship graph | Cross-session entity linking via NER pipeline |

Memory events are automatically stored after each swarm run and made available to future agents via the Planner and Retriever roles.

---

## Security

- **Authentication**: Firebase JWT tokens verified on every API request
- **Authorization**: Supabase Row-Level Security (RLS) policies ensure users only access their own data
- **Approval Gates**: High/medium-risk executor actions require explicit human approval before execution
- **Sandboxing**: File I/O restricted to `workspace/` directory; code execution runs in isolated context
- **Rate Limiting**: Redis-based per-user rate limits (configurable via `config/rate_limits.yaml`)
- **Circuit Breaker**: Automatic failure isolation for external API calls
- **Audit Logging**: Every action logged with user ID, timestamp, action type, and risk level

---

## Documentation

Detailed specifications are available in the `docs/` folder:

| Document | Contents |
|---|---|
| `SECURITY.md` | Firebase auth flow, Supabase RLS, rate limits, circuit breakers, sandboxing |
| `QUALITY.md` | Python/TS standards, Pydantic validation, execution benchmarks |
| `ARCHITECTURE.md` | Class layouts, state flowcharts, memory hierarchies |
| `TESTING.md` | Testing pyramid, coverage configs, E2E playbooks |
| `CONTRIBUTING.md` | Branching strategy, custom tool addition, hot-reload rules |
| `RUNBOOK.md` | Deploy scripts, troubleshooting commands, log parsers |
| `CHANGELOG.md` | Release history |

---

## License

This project is proprietary. All rights reserved.
