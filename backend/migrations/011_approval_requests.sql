CREATE TABLE IF NOT EXISTS approval_requests (
    id UUID NOT NULL PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
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
