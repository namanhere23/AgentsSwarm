CREATE TABLE IF NOT EXISTS agent_delegation_log (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    swarm_run_id UUID NOT NULL REFERENCES swarm_runs(id) ON DELETE CASCADE,
    from_agent VARCHAR NOT NULL,
    to_agent VARCHAR NOT NULL,
    task_description TEXT NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE agent_delegation_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY delegation_log_isolation ON agent_delegation_log
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM swarm_runs sr
            WHERE sr.id = swarm_run_id
            AND (auth.jwt() ->> 'sub') = sr.user_id::text
        )
    );
