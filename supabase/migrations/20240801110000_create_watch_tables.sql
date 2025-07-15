-- This migration file was created to backfill the local schema history.
-- The watch_history and watch_progress tables were created manually in the dashboard,
-- which caused a desync between the live database and the local migration files.
-- This file contains the CREATE TABLE statements to match the live schema,
-- ensuring that the local migration history is accurate and complete.

CREATE TABLE IF NOT EXISTS public.watch_history (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL,
    media_type text NOT NULL,
    media_id text NOT NULL,
    season_number integer,
    episode_number integer,
    watched_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS public.watch_progress (
    id BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    user_id uuid NOT NULL,
    media_type text NOT NULL,
    media_id text NOT NULL,
    season_number integer,
    episode_number integer,
    progress_seconds real,
    updated_at timestamp with time zone,
    duration_seconds integer
);

-- Note: This migration does not include constraints, sequences, or primary keys
-- as they were likely created automatically by Supabase. We only define the core table
-- structure to satisfy the migration history. Subsequent migrations will add policies and indexes. 