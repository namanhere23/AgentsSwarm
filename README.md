# Agent Swarms

Agent Swarms is a self-hosted, general-purpose multi-agent operating system designed to run collaborative AI crews (composed of Planners, Retrievers, Executors, and Validators) to solve complex multi-step objectives using zero-cost free-tier APIs.

## Directory Structure
- `backend/`: FastAPI application endpoints, model schemas, services, tools, and background workers.
- `frontend/`: React + Vite single page application dashboard.
- `crews/`: Declarative YAML configurations defining agents, backstories, and goals.
- `tools/`: Dynamic user-created custom tool SDK modules.
- `workspace/`: Sandboxed folder for file input/outputs.
- `docs/`: Technical manuals, verification playbooks, and guidelines.
- `config/`: Global rate limit configurations.

## Quick Start
1. Configure credentials: `cp .env.example .env` and insert your API keys.
2. Spin up services: `docker-compose -f docker-compose.dev.yml up -d`
3. Launch backend API:
   ```bash
   pip install -r backend/requirements.txt
   uvicorn backend.main:app --reload --port 8000
   ```
4. Start crew workers:
   ```bash
   python -m backend.workers.crew_consumer
   ```
5. Spin up frontend dashboard:
   ```bash
   cd frontend && npm install && npm run dev
   ```

## Technical Manuals (Documentation Matrix)
Detailed specifications are available in the `docs/` folder:
- [SECURITY.md](file:///c:/aa/as1/agent-swarms/docs/SECURITY.md): Firebase Authentication flow, Supabase RLS policies, rate limits, circuit breakers, sandboxing, and audit logs.
- [QUALITY.md](file:///c:/aa/as1/agent-swarms/docs/QUALITY.md): Python/TS standards, Pydantic verification, and execution benchmarks.
- [AUDIT.md](file:///c:/aa/as1/agent-swarms/docs/docs/AUDIT.md): Gate-control milestone checklist.
- [TESTING.md](file:///c:/aa/as1/agent-swarms/docs/TESTING.md): Testing pyramid, coverage configurations, and E2E manuals.
- [CONTRIBUTING.md](file:///c:/aa/as1/agent-swarms/docs/CONTRIBUTING.md): Branching definitions, custom tool addition steps, and hot-reload rules.
- [ARCHITECTURE.md](file:///c:/aa/as1/agent-swarms/docs/ARCHITECTURE.md): Class layouts, state flowcharts, and memory hierarchies.
- [RUNBOOK.md](file:///c:/aa/as1/agent-swarms/docs/RUNBOOK.md): Deploy scripts, troubleshooting commands, and log parsers.
- [CHANGELOG.md](file:///c:/aa/as1/agent-swarms/docs/CHANGELOG.md): History of system releases.
