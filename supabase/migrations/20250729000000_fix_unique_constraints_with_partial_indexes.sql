-- This migration replaces the faulty unique constraints with partial unique indexes.
-- Standard unique constraints do not correctly handle conflicts when nullable columns
-- (like season_number and episode_number for movies) are involved.
-- These partial indexes create two separate uniqueness rules: one for items WITH
-- season/episode numbers (TV shows) and one for items WITHOUT (movies).
-- This ensures the ON CONFLICT clause in the save_watch_progress function
-- will now work correctly for all media types.

-- Drop the old, incorrect unique constraints from both tables
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS watch_history_user_media_episode_unique;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_user_media_episode_unique;

-- === watch_history table ===
-- Index for TV shows/anime (where episode_number is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_unique_tv_episode_idx
ON public.watch_history (user_id, media_id, media_type, season_number, episode_number)
WHERE episode_number IS NOT NULL;

-- Index for movies (where episode_number IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_unique_movie_idx
ON public.watch_history (user_id, media_id, media_type)
WHERE episode_number IS NULL;

-- === watch_progress table ===
-- Index for TV shows/anime (where episode_number is NOT NULL)
CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_unique_tv_episode_idx
ON public.watch_progress (user_id, media_id, media_type, season_number, episode_number)
WHERE episode_number IS NOT NULL;

-- Index for movies (where episode_number IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_unique_movie_idx
ON public.watch_progress (user_id, media_id, media_type)
WHERE episode_number IS NULL; 