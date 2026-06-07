CREATE TABLE IF NOT EXISTS memory_graph_nodes (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type VARCHAR NOT NULL,
    label VARCHAR NOT NULL,
    swarm_run_id UUID NOT NULL REFERENCES swarm_runs(id) ON DELETE CASCADE,
    UNIQUE(label, entity_type)
);

CREATE TABLE IF NOT EXISTS memory_graph_edges (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    source_node_id UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
    target_node_id UUID NOT NULL REFERENCES memory_graph_nodes(id) ON DELETE CASCADE,
    relationship_type VARCHAR NOT NULL,
    weight INTEGER NOT NULL DEFAULT 1
);

ALTER TABLE memory_graph_nodes ENABLE ROW LEVEL SECURITY;
ALTER TABLE memory_graph_edges ENABLE ROW LEVEL SECURITY;

CREATE POLICY graph_nodes_isolation ON memory_graph_nodes
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM swarm_runs sr
            WHERE sr.id = swarm_run_id
            AND (auth.jwt() ->> 'sub') = sr.user_id::text
        )
    );

CREATE POLICY graph_edges_isolation ON memory_graph_edges
    FOR ALL TO authenticated
    USING (true);
