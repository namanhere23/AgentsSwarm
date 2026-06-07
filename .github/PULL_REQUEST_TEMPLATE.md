# Pull Request

## Checklist for Merging to Develop/Main
Please verify each check below is completed prior to asking for review.

### Security
- [ ] Supabase RLS policies are enforced (isolated using Firebase UID matching `auth.jwt() ->> 'sub'`).
- [ ] No raw secrets or API keys are printed in logs or included in frontend assets.
- [ ] All inputs are strictly validated.
- [ ] Rate limits (Gemini/Groq/Serper) are respected via the Redis middleware.
- [ ] External tool calls block on human approval in the Approval Gate.

### Code Quality & Standards
- [ ] Async/await logic is disciplined with proper error catching.
- [ ] Code is formatted with `black` and linted with `ruff`.
- [ ] TypeScript components check without errors via `tsc --noEmit`.
- [ ] Pydantic models validate responses and parameters accurately.

### Architecture & Memory
- [ ] Supabase repository updates correctly persist swarm execution states.
- [ ] ChromaDB embeddings are upserted with metadata mapped to Postgres UUIDs.
- [ ] Entities are correctly extracted via spaCy NER.

### Verification & Testing
- [ ] Unit test coverage target met or exceeded (85% on core modules).
- [ ] E2E/Integration tests pass locally.
- [ ] Handlers fail gracefully under dependency outage conditions (e.g. database down, LLM outage with breaker tripping).
