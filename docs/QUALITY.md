# Quality and Standards Guide (docs/QUALITY.md)

## 1. Python Coding Standards
- **Style:** Strictly adhere to PEP 8 formatting.
- **Formatting Tools:** Use `black` (24.4.2) for formatting and `ruff` (0.4.3) for linting.
- **Typing:** Enforce strict type hints across all module function signatures.
- **Imports:** Group imports logically (stdlib, third-party, local modules).

## 2. TypeScript/Frontend Standards
- **Style:** Modern functional React components with Hooks.
- **State Management:** Use `zustand` for lightweight state coordination.
- **Type Checking:** Run type checks via `tsc --noEmit` before commits.
- **Linting:** Enforce ESLint rules.

## 3. Pydantic Verification
- All endpoints must declare and return validated Pydantic model schemas.
- Set descriptive fields, validation constraints (e.g. `Field(..., max_length=2000)`), and accurate default initializers.

## 4. Async/Await Discipline
- Avoid blocking calls in the main event loop.
- Use `httpx.AsyncClient` for remote HTTP traffic.
- Offload heavyweight blocking executions (e.g. LLM calls, background workers) using Redis Streams or `asyncio.to_thread`.
- Enforce execution timeouts on asynchronous tasks.

## 5. CrewAI Integration Rules
- Crews must compile in strict alignment with `Process.hierarchical` or `Process.sequential`.
- Explicitly inject configured failover-resilient `LLMAdapter` instances into all agents.
- Enable `allow_delegation=True` exclusively on Orchestrator and Validator roles.

## 6. Naming Conventions
- **Database Tables:** Snake case, plural (`swarm_runs`, `memory_events`).
- **Python Code:** Snake case functions/variables, Pascal case classes.
- **TypeScript Code:** Camel case variables/functions, Pascal case types/components.

## 7. Performance Targets
- **Route Latency:** P95 response time ≤ 300ms for database select/insert routes.
- **Resource Constraints:** Under maximum concurrency (4 parallel runs), API container RAM must not exceed 8GB.
