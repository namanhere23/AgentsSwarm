CREATE TABLE IF NOT EXISTS users (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    preferences JSONB NULL
);

CREATE INDEX IF NOT EXISTS idx_users_id ON users(id);

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY users_isolation ON users
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub') = id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = id::text);
CREATE TABLE IF NOT EXISTS swarm_runs (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS audit_log (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_request_id UUID NOT NULL,
    tool_name VARCHAR NOT NULL,
    input_payload JSONB NOT NULL,
    output_payload JSONB NULL,
    duration_ms INTEGER NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

-- INSERT-only: authenticated users can insert, nobody can update or delete
CREATE POLICY audit_log_insert ON audit_log
    FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY audit_log_no_update ON audit_log
    FOR UPDATE
    TO authenticated
    USING (false);

CREATE POLICY audit_log_no_delete ON audit_log
    FOR DELETE
    TO authenticated
    USING (false);
CREATE TABLE IF NOT EXISTS memory_events (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
CREATE TABLE IF NOT EXISTS memory_entities (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    memory_event_id UUID NOT NULL REFERENCES memory_events(id) ON DELETE CASCADE,
    entity_type VARCHAR NOT NULL,
    entity_text VARCHAR NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_memory_entities_event ON memory_entities(memory_event_id);

ALTER TABLE memory_entities ENABLE ROW LEVEL SECURITY;

CREATE POLICY memory_entities_isolation ON memory_entities
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM memory_events me
            WHERE me.id = memory_event_id
            AND (auth.jwt() ->> 'sub') = me.user_id::text
        )
    );
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
-- Requires pg_cron extension enabled in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'memory-decay-daily',
    '0 0 * * *',
    $$UPDATE memory_events
      SET effective_score = priority_score * exp(-(ln(2)/30) * extract(day from now() - created_at))$$
);
CREATE TABLE IF NOT EXISTS llm_call_log (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    trace_id UUID NOT NULL,
    model VARCHAR NOT NULL,
    provider VARCHAR NOT NULL,
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE llm_call_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY llm_log_insert ON llm_call_log
    FOR INSERT TO authenticated
    WITH CHECK (true);
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
CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swarm_run_id UUID NOT NULL REFERENCES swarm_runs(id) ON DELETE CASCADE,
    tool_name VARCHAR NOT NULL,
    proposed_payload JSONB NOT NULL,
    risk_level VARCHAR NOT NULL CHECK (risk_level IN ('low', 'medium', 'high')),
    status VARCHAR NOT NULL CHECK (status IN ('pending', 'approved', 'rejected', 'executed', 'failed')),
    rejection_reason TEXT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE approval_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY approval_requests_isolation ON approval_requests
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'sub') = user_id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);
CREATE TABLE IF NOT EXISTS rollback_actions (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    audit_log_id UUID NOT NULL REFERENCES audit_log(id) ON DELETE CASCADE,
    inverse_payload JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE rollback_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY rollback_actions_insert ON rollback_actions
    FOR INSERT TO authenticated
    WITH CHECK (true);

CREATE POLICY rollback_actions_select ON rollback_actions
    FOR SELECT TO authenticated
    USING (true);
CREATE TABLE IF NOT EXISTS scheduled_swarms (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    crew_id VARCHAR NOT NULL,
    objective TEXT NOT NULL,
    cron_expression VARCHAR NOT NULL,
    timezone VARCHAR NOT NULL DEFAULT 'UTC',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE scheduled_swarms ENABLE ROW LEVEL SECURITY;

CREATE POLICY scheduled_swarms_isolation ON scheduled_swarms
    FOR ALL TO authenticated
    USING ((auth.jwt() ->> 'sub') = user_id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);

-- Migration: 014_api_keys.sql
-- Description: Create api_keys table for CLI authentication

CREATE TABLE IF NOT EXISTS api_keys (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    api_key VARCHAR NOT NULL UNIQUE,
    name VARCHAR NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key ON api_keys(api_key);

ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY api_keys_isolation ON api_keys
    FOR ALL
    TO authenticated
    USING ((auth.jwt() ->> 'sub') = user_id::text)
    WITH CHECK ((auth.jwt() ->> 'sub') = user_id::text);
