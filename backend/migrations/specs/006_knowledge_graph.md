# Migration Spec: 006_knowledge_graph

## Description
Define `memory_graph_nodes` and `memory_graph_edges` tables for representing entity relationships.

## Schema Details
- Table: `memory_graph_nodes`
  - `id`: UUID (PK, DEFAULT gen_random_uuid())
  - `entity_type`: VARCHAR(50) (NOT NULL)
  - `label`: VARCHAR(255) (NOT NULL)
  - `swarm_run_id`: UUID (NOT NULL, FK -> swarm_runs.id ON DELETE CASCADE)

- Table: `memory_graph_edges`
  - `source_node_id`: UUID (NOT NULL, FK -> memory_graph_nodes.id ON DELETE CASCADE)
  - `target_node_id`: UUID (NOT NULL, FK -> memory_graph_nodes.id ON DELETE CASCADE)
  - `relationship_type`: VARCHAR(100) (NOT NULL)
  - `weight`: INTEGER (NOT NULL, DEFAULT 1)
  - PRIMARY KEY (`source_node_id`, `target_node_id`, `relationship_type`)

## Row Level Security (RLS) Policy
- Enable RLS on both tables.
- Policies isolate nodes/edges based on swarm run user ownership.
