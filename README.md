# Nexsus

> *"One agent is useful. A swarm of agents working together? That's a different game entirely."*

This theme is about orchestrating multiple AI agents—planners, retrievers, executors, validators—that collaborate, self-organize, and solve complex multi-step problems no single agent could handle alone. This is distributed AI architecture at its finest: containerized, scalable, and seriously impressive when it works.

Presented by **Team Nexsus** for the Nationwide Microsoft Hackathon.

---

## 🌟 The Vision

Complex problems require a team. Traditional single-agent systems suffer from context saturation, hallucinations, and rigidity when faced with massive, ambiguous goals. **Nexsus** dismantles the single-agent bottleneck. By centralizing cognitive orchestration and distributing workloads across specialized agent microservices, we shift the user from being a manual "Prompt Engineer" to an "Executive Approver."

### Key Innovations:
*   **Role-Based Collaboration Network:** A dynamic execution graph of Orchestrators, Planners, Retrievers, Executors, and Validators.
*   **Tri-Store Memory & Semantic RAG:** Combines PostgreSQL (Relational State), ChromaDB (High-dimensional Vector Semantics), and Redis with Algorithmic Memory Decay.
*   **The Approval Gate (Human-in-the-Loop):** A risk-aware middleware intercept layer. The system pauses and requests cryptographic WebSocket approval before executing any risky real-world mutations (e.g., REST API calls, file I/O).
*   **Resilient LLM Dispatcher:** Achieves zero-cost uptime by intelligently routing tasks and gracefully failing over across inference endpoints (Gemini 1.5 Flash, Groq, OpenRouter).

---

## 🚀 Tech Stack

*   **Languages & Frameworks:** Python, FastAPI, React, Vite, Zustand, TailwindCSS, Framer Motion
*   **AI & Agent Tech:** CrewAI, LangGraph, spaCy (NER Extraction), OpenAI-Whisper (STT)
*   **APIs & Inference:** Gemini 1.5 Flash, Groq (Llama-3-70b), OpenRouter, Serper.dev
*   **Databases & Storage:** PostgreSQL (Supabase), ChromaDB, Redis
*   **Infrastructure & Security:** Docker, Google Cloud Platform (GCP), WebSockets, Uvicorn, Firebase Authentication

---

## ☁️ Google Cloud Deployment (GCP)

Nexsus is fully containerized and designed for scalable deployment on **Google Cloud Platform (GCP)**. 

1. **Dockerized Microservices**: The backend (FastAPI, Celery workers) and frontend (Vite React) are built as portable Docker containers.
2. **Cloud Managed Infrastructure**: Redis streams, ChromaDB vector storage, and PostgreSQL (via Supabase) are fully decoupled, allowing the core application to scale statelessly in the cloud.
3. **Environment**: Ensure all `.env` configurations (Firebase Auth, LLM keys, Supabase URLs) are securely injected into your GCP deployment environments (e.g., Cloud Run, GKE, or Compute Engine).

---

## 💻 Terminal Support (CLI)

Nexsus features native terminal support for seamless developer interaction. You can launch, monitor, and configure swarms directly from your command line using our custom PowerShell module (`nexsus.ps1`).

### Install via CLI
```powershell
irm https://agents-swarm.vercel.app/cli/install.ps1 | iex
```

### Usage
Once installed, you can use the `nexsus` command globally:
```powershell
nexsus --help
nexsus swarm launch --goal "Analyze quarterly earnings"
nexsus system status
```

---

## ⚡ Quick Start (Local Development)

1. **Configure Backend credentials:** 
   ```bash
   cp .env.example .env
   # Insert your API keys (Gemini, Groq, Firebase, Supabase, etc.)
   ```

2. **Configure Frontend credentials:** 
   ```bash
   cd frontend
   cp .env.example .env
   # Insert your Firebase client credentials
   cd ..
   ```

3. **Spin up core services (Redis, ChromaDB, Postgres):** 
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

4. **Launch the FastAPI Backend:**
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --reload --port 8000
   ```

4. **Start the asynchronous Crew Workers:**
   ```bash
   python -m backend.workers.crew_consumer
   ```

5. **Spin up the React Dashboard:**
   ```bash
   cd frontend
   npm install
   npm run dev
   ```

---

## 📚 Technical Manuals (Documentation Matrix)

Detailed system specifications are available in the `docs/` folder:
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): Class layouts, state flowcharts, LLM fallback diagrams, and Tri-Store memory hierarchies.
- [SECURITY.md](docs/SECURITY.md): Firebase Authentication flow, Supabase RLS policies, rate limits, circuit breakers, sandboxing, and audit logs.
- [QUALITY.md](docs/QUALITY.md): Python/TS standards, Pydantic verification, and Critic loop execution benchmarks.
- [AUDIT.md](docs/AUDIT.md): Gate-control and Human-in-the-Loop milestone checklist.
- [TESTING.md](docs/TESTING.md): Testing pyramid, coverage configurations, and E2E manuals.
- [CONTRIBUTING.md](docs/CONTRIBUTING.md): Branching definitions, custom tool addition steps, and hot-reload rules.
- [RUNBOOK.md](docs/RUNBOOK.md): Deploy scripts, GCP operations, troubleshooting commands, and structured JSON log parsers.
- [CHANGELOG.md](docs/CHANGELOG.md): History of system releases.

---
*Built for scale. Built for the future. Built by **Team Nexsus**.*
