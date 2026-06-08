# Agent Swarms

> *"One agent is useful. A swarm of agents working together? That's a different game entirely."*

**Agent Swarms** is a self-hosted, general-purpose multi-agent operating system. It orchestrates collaborative AI crews—composed of Planners, Retrievers, Executors, and Validators—that collaborate, self-organize, and solve complex multi-step problems that no single agent could handle alone. This is distributed AI architecture at its finest: containerized, scalable, and seriously impressive.

Presented by **Team Nexsus** for the Nationwide Microsoft Hackathon.

---

## 🌟 The Vision

Complex problems require a team. Traditional single-agent systems suffer from context saturation, hallucinations, and rigidity when faced with massive, ambiguous goals. **Agent Swarms** dismantles the single-agent bottleneck. By centralizing cognitive orchestration and distributing workloads across specialized agent microservices, we shift the user from being a manual "Prompt Engineer" to an "Executive Approver."

### Key Innovations:
*   **Role-Based Collaboration Network:** A dynamic execution graph of Orchestrators, Planners, Retrievers, Executors, and Validators.
*   **Tri-Store Memory & Semantic RAG:** Combines PostgreSQL (Relational State), ChromaDB (High-dimensional Vector Semantics), and a spaCy-powered Knowledge Graph with Algorithmic Memory Decay.
*   **The Approval Gate (Human-in-the-Loop):** A risk-aware middleware intercept layer. The system pauses and requests cryptographic WebSocket approval before executing any risky real-world mutations (e.g., REST API calls, file I/O).
*   **Resilient LLM Dispatcher:** Achieves zero-cost uptime by intelligently routing tasks and gracefully failing over across free-tier inference endpoints (Gemini 1.5 Flash, Groq, OpenRouter).

---

## 🚀 Tech Stack

*   **Languages & Frameworks:** Python, FastAPI, React, Vite, Zustand
*   **AI & Agent Tech:** CrewAI, LangGraph, spaCy (NER Extraction), OpenAI-Whisper (STT), ElevenLabs SDK (TTS)
*   **APIs & Inference:** Gemini 1.5 Flash, Groq (Llama-3-70b), OpenRouter, Serper.dev
*   **Databases & Storage:** PostgreSQL (Supabase), ChromaDB, Redis
*   **Infrastructure & Security:** Docker, Docker Compose, WebSockets, Uvicorn, Firebase Authentication

---

## 📁 Directory Structure

- `backend/`: FastAPI application endpoints, LLM adapters, services, tools, and background workers.
- `frontend/`: React + Vite single-page application dashboard.
- `crews/`: Declarative YAML configurations defining agents, backstories, and goals.
- `tools/`: Dynamic user-created custom tool SDK modules.
- `workspace/`: Sandboxed folder for file input/outputs.
- `docs/`: Technical manuals, verification playbooks, and guidelines.
- `config/`: Global rate limit and provider routing configurations.

---

## ⚡ Quick Start

1. **Configure credentials:** 
   ```bash
   cp .env.example .env
   # Insert your API keys (Gemini, Groq, Firebase, Supabase, etc.)
   ```

2. **Spin up core services (Redis, ChromaDB, Postgres):** 
   ```bash
   docker-compose -f docker-compose.dev.yml up -d
   ```

3. **Launch the FastAPI Backend:**
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
- [SECURITY.md](docs/SECURITY.md): Firebase Authentication flow, Supabase RLS policies, rate limits, circuit breakers, sandboxing, and audit logs.
- [QUALITY.md](docs/QUALITY.md): Python/TS standards, Pydantic verification, and Critic loop execution benchmarks.
- [AUDIT.md](docs/AUDIT.md): Gate-control and Human-in-the-Loop milestone checklist.
- [TESTING.md](docs/TESTING.md): Testing pyramid, coverage configurations, and E2E manuals.
- [CONTRIBUTING.md](docs/CONTRIBUTING.md): Branching definitions, custom tool addition steps, and hot-reload rules.
- [ARCHITECTURE.md](docs/ARCHITECTURE.md): Class layouts, state flowcharts, LLM fallback diagrams, and Tri-Store memory hierarchies.
- [RUNBOOK.md](docs/RUNBOOK.md): Deploy scripts, troubleshooting commands, and structured JSON log parsers.
- [CHANGELOG.md](docs/CHANGELOG.md): History of system releases.

---
*Built for scale. Built for the future. Built by **Team Nexsus**.*
