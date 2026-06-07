# Migration Spec: 001_users

## Description
Define `users` table with standard schema and isolation policy.

## Schema Details
- Table: `users`
- Columns:
  - `id`: UUID (PK, references Firebase Auth UUID)
  - `email`: VARCHAR(255) (NOT NULL, UNIQUE)
  - `created_at`: TIMESTAMPTZ (DEFAULT now())

## Row Level Security (RLS) Policy
- Enable RLS on `users` table.
- Policies:
  - User can read and update their own record: `(auth.jwt() ->> 'sub') = id::text`.
