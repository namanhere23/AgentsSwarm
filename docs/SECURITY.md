# Security Specification (docs/SECURITY.md)

## 1. Authentication Flow
- **Provider:** Firebase Authentication using Google OAuth.
- **Frontend Flow:** React frontend triggers Google Sign-In using `firebase/auth` and extracts the ID token.
- **Header Injection:** Axios client intercepts outgoing requests and adds `Authorization: Bearer <token>`.
- **Backend Flow:** FastAPI globally extracts and validates the Bearer JWT token using `firebase-admin` SDK. The verified user ID is saved on the `request.state.user_id`.

## 2. Supabase Row Level Security (RLS)
- **Custom JWT Secret:** The Firebase Project ID and JWT Secret are shared with Supabase settings.
- **Client Instantiation:** The backend instantiates Supabase clients on a per-request basis with the user's Bearer token.
- **Policy Enforcement:** RLS policies isolate database records. Query matching is performed via `(auth.jwt() ->> 'sub') = user_id::text` for tables containing user data (e.g. `users`, `swarm_runs`, `memory_events`, `approval_requests`).

## 3. Rate Limiting
- **Redis Tokens:** Redis-backed rate limiting protects Gemini (1M tokens/day), Groq (14,400 req/day), and Serper (2,500 requests/month) free quotas.
- **Enforcement:** Verified request scopes (per-tool and per-user) are stored inside `config/rate_limits.yaml`.

## 4. Circuit Breaker
- **Thresholds:** If any LLM provider fails 3 consecutive times with HTTP 429/5xx, requests bypass that provider for 30 minutes.
- **States:** Closed (normal), Open (tripped), Half-Open (recovery testing).

## 5. Execution Sandboxing
- **Restricted Subprocess:** `CodeExecutionTool` runs code inside an isolated subprocess using `subprocess.run(..., timeout=30)`.
- **Pattern Blacklist:** Rejects inputs matching patterns like `import os`, `import subprocess`, `open(`, `__import__` to protect host filesystem.

## 6. Startup Validation
- Fast-fail validation checks for environment secrets at startup:
  - `SECRET_KEY`
  - `FIREBASE_PROJECT_ID`
  - `SUPABASE_JWT_SECRET`
  - `GEMINI_API_KEY`
  - `SERPER_API_KEY`
- Strict CORS verification binds `allow_origins` strictly to `FRONTEND_ORIGIN`.

## 7. Audit Log Immutability
- The `audit_log` table enforces database policies:
  - `INSERT` is enabled.
  - `UPDATE` and `DELETE` are disabled/denied.
- Every external mutation is permanently recorded, trace ID linked, and is cryptographically and operationally untamperable.
