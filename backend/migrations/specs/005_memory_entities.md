# Migration Spec: 005_memory_entities

## Description
Define entity types (`PERSON`, `ORG`, `DATE`, `LOC`, `TOPIC`) mapping to memory events.

## Schema Details
- Table: `memory_entities`
- Columns:
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `memory_event_id`: UUID (NOT NULL, FK -> memory_events.id ON DELETE CASCADE)
  - `entity_type`: VARCHAR(50) (NOT NULL, CHECK (entity_type IN ('PERSON', 'ORG', 'DATE', 'LOC', 'TOPIC')))
  - `label`: VARCHAR(255) (NOT NULL)
  - `created_at`: TIMESTAMPTZ (NOT NULL, DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `memory_entities` table.
- Policies:
  - Isolated access through memory event ownership.
