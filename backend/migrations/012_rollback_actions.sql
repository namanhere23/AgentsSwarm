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
