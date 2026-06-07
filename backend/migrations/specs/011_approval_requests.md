# Migration Spec: 011_approval_requests

## Description
Table storing approval gates. Status: `pending`, `approved`, `rejected`, `executed`, `failed`.

## Schema Details
- Table: `approval_requests`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id ON DELETE CASCADE)
  - `tool_name`: VARCHAR(255) (NOT NULL)
  - `proposed_payload`: JSONB (NOT NULL)
  - `risk_level`: VARCHAR(50) (NOT NULL, CHECK (risk_level IN ('low', 'medium', 'high')))
  - `status`: VARCHAR(50) (NOT NULL, CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')))
  - `rejection_reason`: TEXT (NULLABLE)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `approval_requests`.
- Policies isolate records to the owning user: `(auth.jwt() ->> 'sub') = user_id::text`.
