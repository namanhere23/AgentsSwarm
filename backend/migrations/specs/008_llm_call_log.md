# Migration Spec: 008_llm_call_log

## Description
Table logging LLM usage metrics (prompt and completion tokens, model details).

## Schema Details
- Table: `llm_call_log`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id ON DELETE CASCADE)
  - `trace_id`: VARCHAR(255) (NOT NULL)
  - `provider`: VARCHAR(100) (NOT NULL)
  - `model`: VARCHAR(100) (NOT NULL)
  - `prompt_tokens`: INTEGER (NOT NULL)
  - `completion_tokens`: INTEGER (NOT NULL)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `llm_call_log`.
- Policies isolate records to the owning user.
