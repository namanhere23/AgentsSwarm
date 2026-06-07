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
