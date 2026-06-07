CREATE TABLE IF NOT EXISTS swarm_runs (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crew_id VARCHAR NOT NULL,
    objective TEXT NOT NULL,
    status VARCHAR NOT NULL CHECK (status IN ('queued', 'running', 'completed', 'failed')),
    priority_score FLOAT NULL,
    output_summary TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    completed_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_swarm_runs_user_id ON swarm_runs(user_id);

ALTER TABLE swarm_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY swarm_runs_isolation ON swarm_runs
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub') = user_id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);
