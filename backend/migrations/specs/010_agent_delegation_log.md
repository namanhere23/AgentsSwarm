# Migration Spec: 010_agent_delegation_log

## Description
Table logging CrewAI inter-agent delegations.

## Schema Details
- Table: `agent_delegation_log`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id ON DELETE CASCADE)
  - `from_agent`: VARCHAR(255) (NOT NULL)
  - `to_agent`: VARCHAR(255) (NOT NULL)
  - `task_description`: TEXT (NOT NULL)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `agent_delegation_log`.
- Policies isolate records through swarm run user ownership.
