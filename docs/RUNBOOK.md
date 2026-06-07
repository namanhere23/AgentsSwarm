# Operations Runbook (docs/RUNBOOK.md)

## 1. Deployment Instructions
To spin up the local development containers and servers:
```bash
# 1. Start Docker dependency stack
docker-compose -f docker-compose.dev.yml up -d

# 2. Set up local virtual environment and install requirements
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
python -m spacy download en_core_web_sm

# 3. Startup the FastAPI server
uvicorn backend.main:app --reload --port 8000

# 4. Startup the background crew execution worker
python -m backend.workers.crew_consumer

# 5. Startup the React frontend dashboard
cd frontend && npm install && npm run dev
```

## 2. Project Configurations
Configurations reside in:
- `.env` for secrets, paths, and active keys.
- `config/rate_limits.yaml` for third-party api rate limits.
- `crews/` for YAML-based agent crews configurations.

## 3. Hot-Reload Verification
- Modifying files inside `crews/*.yaml` causes an automatic watchdog trigger.
- Confirm reload log prints in console: `INFO: Crew definitions hot-reloaded successfully`.

## 4. Reading Logs
- Log formatting defaults to structured JSON.
- Standard keys: `timestamp`, `level`, `trace_id`, `service`, `message`.
- To trace a specific execution run, search logs matching the request `trace_id`.

## 5. cURL Command Triggers
To manually verify endpoints:
```bash
# Health Check
curl -X GET http://localhost:8000/health

# Post a Swarm Run
curl -X POST http://localhost:8000/swarms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"crew_id": "research-crew", "objective": "Run SWOT analysis"}'
```

## 6. Limitations
- **API Limits:** Free tier limitations apply (e.g. Gemini 1M tokens/day).
- **Subprocesses:** Python code execution is limited to 30 seconds timeouts and cannot write files outside the workspace directory.
