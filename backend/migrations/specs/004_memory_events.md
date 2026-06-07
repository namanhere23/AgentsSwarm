# Migration Spec: 004_memory_events

## Description
Define `memory_events` table with `content_tsv` GIN index for full-text search.

## Schema Details
- Table: `memory_events`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id)
  - `agent_role`: VARCHAR(255) (NOT NULL)
  - `task_description`: TEXT (NOT NULL)
  - `content`: TEXT (NOT NULL)
  - `content_tsv`: TSVECTOR (GENERATED ALWAYS AS (to_tsvector('english', content)) STORED)
  - `priority_score`: FLOAT (NOT NULL, DEFAULT 0.5)
  - `effective_score`: FLOAT (NOT NULL, DEFAULT 0.5)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Indexes
- GIN index on `content_tsv` for text search.
- BTREE index on `user_id`.

## Row Level Security (RLS) Policy
- Enable RLS on `memory_events` table.
- Policies:
  - Isolated access: `(auth.jwt() ->> 'sub') = user_id::text`.
