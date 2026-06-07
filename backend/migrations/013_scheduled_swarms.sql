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
