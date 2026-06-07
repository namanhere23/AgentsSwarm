# Migration Spec: 003_audit_log

## Description
Define `audit_log` table with INSERT-only policy. `UPDATE` and `DELETE` operations are strictly denied.

## Schema Details
- Table: `audit_log`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `approval_request_id`: UUID (NOT NULL, FK -> approval_requests.id)
  - `tool_name`: VARCHAR(255) (NOT NULL)
  - `input_payload`: JSONB (NOT NULL)
  - `output_payload`: JSONB (NULLABLE)
  - `duration_ms`: INTEGER (NULLABLE)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `audit_log` table.
- Policies:
  - `INSERT` is allowed for authenticated users.
  - `SELECT` is allowed for users owning the corresponding swarm run.
  - `UPDATE` and `DELETE` are strictly denied.
