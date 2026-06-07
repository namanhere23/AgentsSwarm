# Migration Spec: 013_scheduled_swarms

## Description
Table storing cron-driven swarm configurations.

## Schema Details
- Table: `scheduled_swarms`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `user_id`: UUID (NOT NULL, FK -> users.id)
  - `crew_id`: VARCHAR(255) (NOT NULL)
  - `objective`: TEXT (NOT NULL)
  - `cron_expression`: VARCHAR(100) (NOT NULL)
  - `timezone`: VARCHAR(50) (NOT NULL, DEFAULT 'UTC')
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `scheduled_swarms`.
- Policies isolate records to the owning user: `(auth.jwt() ->> 'sub') = user_id::text`.
