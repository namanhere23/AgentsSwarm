# Migration Spec: 012_rollback_actions

## Description
Table storing inverse payloads for action rollbacks.

## Schema Details
- Table: `rollback_actions`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `audit_log_id`: UUID (NOT NULL, FK -> audit_log.id ON DELETE CASCADE)
  - `inverse_payload`: JSONB (NOT NULL)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `rollback_actions`.
- Policies isolate records through audit log ownership.
