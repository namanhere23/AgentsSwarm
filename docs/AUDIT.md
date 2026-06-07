# Milestone Audit Checklist (docs/AUDIT.md)

This document contains the checklist required to verify milestone completion before moving between phases.

## 1. Security Verification Checklist
- [ ] No hardcoded api keys or credentials in commit history or workspace configuration.
- [ ] Row Level Security (RLS) policies are active and verified to prevent cross-user data leakage.
- [ ] Sandboxed file/command executions restrict path traversals outside the `workspace/` boundary.
- [ ] External actions cannot execute without human sign-off via the Approval Gate.

## 2. Quality and Syntax Checklist
- [ ] `black --check backend/` yields zero format errors.
- [ ] `ruff check backend/` runs clean without warnings or violations.
- [ ] `frontend/npx tsc --noEmit` returns zero TypeScript type compilation errors.
- [ ] ESLint checks complete successfully for React TS assets.

## 3. Testing Compliance Checklist
- [ ] Unit testing coverage target of 85% is satisfied.
- [ ] All integration and E2E test scripts compile and execute successfully.
- [ ] Mock environment variables correctly simulate missing system resources during execution.

## 4. Architecture Standards Checklist
- [ ] Async/Await loops are fully decoupled and event-driven.
- [ ] Suppress any thread-blocking actions in the main web gateway container.
- [ ] LLM Adapter failover correctly handles HTTP 429/5xx and circuit-breaker cycles.
- [ ] supbabase database checkpoints write reliably on every task milestone.

## 5. Data Integrity Checklist
- [ ] RAG pipelines output correct embeddings using 384-dimensional calculations.
- [ ] spaCy NER processes entities accurately and updates both knowledge graph nodes and edges.
- [ ] Cron schedule updates decay metrics on a regular daily timeline.
