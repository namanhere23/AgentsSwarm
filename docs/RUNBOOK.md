# Operations Runbook (docs/RUNBOOK.md)

## 1. Local Development Deployment
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

## 2. GCP Deployment Operations
Nexsus is deployed on **Google Cloud Platform (GCP)**. Operations and debugging in the cloud context require the following:
- **Cloud Run / Container Registry**: The frontend and backend are containerized. New deployments trigger a build in Google Cloud Build which pushes images to the Artifact Registry.
- **Environment Variables**: `.env` configurations are securely managed and injected via GCP Secrets Manager.
- **Log Explorer**: View production logs in GCP Cloud Logging. Logs are structured as JSON, so you can easily query by `trace_id` or `level`.
- **Scaling**: The FastAPI Gateway auto-scales based on HTTP traffic. Background workers scale based on Redis queue depths.

## 3. Project Configurations
Configurations reside in:
- `.env` (root) for backend secrets, paths, and active LLM keys.
- `frontend/.env` for frontend Firebase connections and application URLs.
- `config/rate_limits.yaml` for third-party api rate limits.
- `crews/` for YAML-based agent crews configurations.

## 4. Hot-Reload Verification
- Modifying files inside `crews/*.yaml` causes an automatic watchdog trigger.
- Confirm reload log prints in console: `INFO: Crew definitions hot-reloaded successfully`.

## 5. Reading Logs
- Log formatting defaults to structured JSON.
- Standard keys: `timestamp`, `level`, `trace_id`, `service`, `message`.
- To trace a specific execution run, search logs matching the request `trace_id`.

## 6. CLI Command Triggers
To manually verify endpoints natively, use the `nexsus` CLI tool or standard cURL:
```powershell
# Using Terminal Support (PowerShell)
nexsus system status
nexsus swarm launch --goal "Run SWOT analysis"

# Using cURL
curl -X GET http://localhost:8000/health
curl -X POST http://localhost:8000/swarms \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"crew_id": "research-crew", "objective": "Run SWOT analysis"}'
```

## 7. Limitations
- **API Limits:** Free tier limitations apply (e.g. Gemini 1M tokens/day).
- **Subprocesses:** Python code execution is limited to 30 seconds timeouts and cannot write files outside the workspace directory.
