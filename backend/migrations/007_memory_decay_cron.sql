-- Requires pg_cron extension enabled in Supabase
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'memory-decay-daily',
    '0 0 * * *',
    $$UPDATE memory_events
      SET effective_score = priority_score * exp(-(ln(2)/30) * extract(day from now() - created_at))$$
);
