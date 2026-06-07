# Migration Spec: 007_memory_decay_cron

## Description
Schedule memory decay update daily at midnight. Requires `pg_cron` extension.

## SQL / Cron Details
- Daily at 00:00 UTC:
  `UPDATE memory_events SET effective_score = priority_score * exp(-(ln(2)/30) * extract(day from now() - created_at))`
- Dependent on pg_cron extension being loaded in Postgres backend.
