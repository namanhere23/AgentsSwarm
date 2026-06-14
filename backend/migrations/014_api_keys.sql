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
