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
