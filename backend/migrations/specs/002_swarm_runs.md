# Migration Spec: 002_swarm_runs

## Description
Define `swarm_runs` table with `user_id` referencing `users(id)`.

## Schema Details
- Table: `swarm_runs`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `crew_id`: VARCHAR(255) (NOT NULL)
  - `objective`: TEXT (NOT NULL)
  - `status`: VARCHAR(50) (NOT NULL, CHECK (status IN ('queued', 'running', 'completed', 'failed')))
  - `priority_score`: FLOAT (NULLABLE)
  - `output_summary`: TEXT (NULLABLE)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())
  - `completed_at`: TIMESTAMPTZ (NULLABLE)

## Row Level Security (RLS) Policy
- Enable RLS on `swarm_runs` table.
- Policies:
  - Isolated access: `(auth.jwt() ->> 'sub') = user_id::text`.
