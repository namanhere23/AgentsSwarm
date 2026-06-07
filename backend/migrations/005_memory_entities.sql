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
