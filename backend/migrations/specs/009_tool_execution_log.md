# Migration Spec: 009_tool_execution_log

## Description
Table logging tool inputs and outputs.

## Schema Details
- Table: `tool_execution_log`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id ON DELETE CASCADE)
  - `tool_name`: VARCHAR(255) (NOT NULL)
  - `input`: TEXT (NOT NULL)
  - `output`: TEXT (NOT NULL)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `tool_execution_log`.
- Policies isolate records to the owning user.
