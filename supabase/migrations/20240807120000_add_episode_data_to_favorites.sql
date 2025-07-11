-- Add episode-specific columns to favorites table
ALTER TABLE public.favorites 
ADD COLUMN IF NOT EXISTS season_number INTEGER,
ADD COLUMN IF NOT EXISTS episode_number INTEGER,
ADD COLUMN IF NOT EXISTS episode_name TEXT;

-- Add a unique constraint to prevent duplicate favorites for the same episode
DROP INDEX IF EXISTS favorites_unique_episode;
CREATE UNIQUE INDEX favorites_unique_episode ON public.favorites 
(user_id, media_id, media_type, season_number, episode_number) 
WHERE season_number IS NOT NULL AND episode_number IS NOT NULL;

-- Keep existing unique constraint for movies (no episodes)
DROP INDEX IF EXISTS favorites_unique_movie;
CREATE UNIQUE INDEX favorites_unique_movie ON public.favorites 
(user_id, media_id, media_type) 
WHERE season_number IS NULL AND episode_number IS NULL; 