-- This migration ensures the definitive, correct version of the save_watch_progress function
-- and its corresponding partial unique indexes are in place. It consolidates previous attempts
-- and provides the stable, working solution.

-- Step 1: Drop any legacy unique constraints that might conflict.
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS unique_user_media_history;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS unique_user_media_progress;
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS watch_history_user_media_episode_unique;
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS watch_progress_user_media_episode_unique;

-- Step 2: Create the correct partial unique indexes for both tables.
-- These create separate uniqueness rules for movies (episode_number IS NULL)
-- and TV shows (episode_number IS NOT NULL).

-- Indexes for watch_progress table
CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_unique_tv_episode_idx
ON public.watch_progress (user_id, media_id, media_type, season_number, episode_number)
WHERE (episode_number IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS watch_progress_unique_movie_idx
ON public.watch_progress (user_id, media_id, media_type)
WHERE (episode_number IS NULL);

-- Indexes for watch_history table
CREATE UNIQUE INDEX IF NOT EXISTS watch_history_unique_tv_episode_idx
ON public.watch_history (user_id, media_id, media_type, season_number, episode_number)
WHERE (episode_number IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS watch_history_unique_movie_idx
ON public.watch_history (user_id, media_id, media_type)
WHERE (episode_number IS NULL);


-- Step 3: Create or replace the save_watch_progress function with the correct logic.
-- This function uses an IF/ELSE block to target the correct partial unique index
-- based on whether an episode number is present, which is the critical fix.
CREATE OR REPLACE FUNCTION public.save_watch_progress(
    p_media_id text,
    p_media_type text,
    p_season_number integer,
    p_episode_number integer,
    p_progress_seconds integer,
    p_duration_seconds integer DEFAULT NULL,
    p_force_history_entry boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
BEGIN
    IF p_episode_number IS NOT NULL THEN
        -- Handle TV shows and anime episodes
        INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number) WHERE episode_number IS NOT NULL
        DO UPDATE SET
            progress_seconds = p_progress_seconds,
            duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
            updated_at = now()
        WHERE watch_progress.user_id = auth.uid();

        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number) WHERE episode_number IS NOT NULL
        DO UPDATE SET watched_at = now()
        WHERE watch_history.user_id = auth.uid();
    ELSE
        -- Handle movies (where episode_number is null)
        INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
        VALUES (auth.uid(), p_media_id, p_media_type, NULL, NULL, p_progress_seconds, p_duration_seconds, now())
        ON CONFLICT (user_id, media_id, media_type) WHERE episode_number IS NULL
        DO UPDATE SET
            progress_seconds = p_progress_seconds,
            duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
            updated_at = now()
        WHERE watch_progress.user_id = auth.uid();

        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, NULL, NULL, now())
        ON CONFLICT (user_id, media_id, media_type) WHERE episode_number IS NULL
        DO UPDATE SET watched_at = now()
        WHERE watch_history.user_id = auth.uid();
    END IF;
END;
$function$;

-- Step 4: Grant permissions and set the search path for security.
GRANT EXECUTE ON FUNCTION public.save_watch_progress(text, text, int, int, int, int, boolean) TO authenticated;
ALTER FUNCTION public.save_watch_progress(text, text, int, int, int, int, boolean) SET search_path = public;

-- End of the definitive fix migration. 