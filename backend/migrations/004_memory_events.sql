CREATE TABLE IF NOT EXISTS memory_events (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swarm_run_id UUID NOT NULL REFERENCES swarm_runs(id) ON DELETE CASCADE,
    agent_role VARCHAR NOT NULL,
    task_description TEXT NOT NULL,
    content TEXT NOT NULL,
    content_tsv TSVECTOR GENERATED ALWAYS AS (to_tsvector('english', content)) STORED,
    priority_score FLOAT NOT NULL DEFAULT 0.5,
    effective_score FLOAT NOT NULL DEFAULT 0.5,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_memory_events_user_id ON memory_events(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_events_content_tsv ON memory_events USING GIN(content_tsv);

ALTER TABLE memory_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY memory_events_isolation ON memory_events
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'sub') = user_id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);
