CREATE TABLE IF NOT EXISTS tool_execution_log (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_run_id UUID REFERENCES swarm_runs(id) ON DELETE SET NULL,
    tool_name VARCHAR NOT NULL,
    input TEXT NOT NULL,
    output TEXT,
    duration_ms INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE tool_execution_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY tool_log_insert ON tool_execution_log
    FOR INSERT TO authenticated
    WITH CHECK (true);
