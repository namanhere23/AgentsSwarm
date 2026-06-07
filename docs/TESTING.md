# Testing Guide (docs/TESTING.md)

## 1. Test Pyramid Configuration
- **Unit Tests:** Focus on isolated business logic (failover adapters, rate limiting buckets, security filters). Checked via `pytest`. Target: 85% coverage.
- **Integration Tests:** Focus on service interactions (Supabase repository inserts, ChromaDB embeddings queries, checkpointers).
- **End-to-End (E2E) Tests:** Simulates a complete user session from objective launch to WebSocket output reports.

## 2. Environment Setup for Tests
Tests load simulated credentials using the following setup in `pytest` variables:
```bash
SECRET_KEY=test_secret_key
ENVIRONMENT=test
FIREBASE_PROJECT_ID=test-project
SUPABASE_URL=http://localhost:54321
SUPABASE_JWT_SECRET=test_jwt_secret
GEMINI_API_KEY=mock_key
GROQ_API_KEY=mock_key
SERPER_API_KEY=mock_key
MOCK_TOOLS=true
```

## 3. Bootstrap and Test Commands
To execute the test suite:
```bash
# 1. Run all unit tests
pytest backend/tests/unit

# 2. Run database integration tests
pytest backend/tests/integration

# 3. Check coverage
pytest --cov=backend/app --cov-report=html
```

## 4. End-to-End 10-Step Script
To manually or programmatically verify the system:
1. Initialize container resources via `docker-compose up -d`.
2. Retrieve valid Firebase token for a test profile.
3. Call `GET /health` to confirm all components (Postgres, Redis, ChromaDB, API) are reported as `up`.
4. Trigger a new Swarm run: `POST /swarms` with `crew_id='research-crew'` and `objective='Test execution plan'`.
5. Connect to the WebSocket stream at `ws://localhost:8000/ws/{swarm_run_id}`.
6. Verify receipt of `SWARM_STARTED` and `TASK_STARTED` updates.
7. Intercept Executor external tool call inside `approval_requests` database table.
8. Approve action by posting to `POST /approvals/{id}/approve` using Bearer JWT.
9. Verify WebSocket receives `APPROVAL_GRANTED` and `SWARM_COMPLETED` events.
10. Retrieve the completed report markdown via `GET /swarms/{id}/report`.
