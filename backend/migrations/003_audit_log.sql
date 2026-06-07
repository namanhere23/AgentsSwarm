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
