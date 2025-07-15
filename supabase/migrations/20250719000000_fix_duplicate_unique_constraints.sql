
-- Drop redundant unique constraints on watch_history
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS unique_user_media_history;
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS watch_history_unique_user_media_episode;
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS watch_history_unique_v2;

-- Add back a single, well-named unique constraint for watch_history
ALTER TABLE public.watch_history
ADD CONSTRAINT watch_history_user_media_episode_unique
UNIQUE (user_id, media_id, media_type, season_number, episode_number);

-- Drop redundant unique constraints on watch_progress
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS unique_user_media_progress;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_unique_user_media_episode;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_unique_v2;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_user_id_media_type_media_id_season_number_ep_key;

-- Add back a single, well-named unique constraint for watch_progress
ALTER TABLE public.watch_progress
ADD CONSTRAINT watch_progress_user_media_episode_unique
UNIQUE (user_id, media_id, media_type, season_number, episode_number); 