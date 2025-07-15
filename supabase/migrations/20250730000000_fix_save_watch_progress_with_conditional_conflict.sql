-- This migration provides the definitive fix for the save_watch_progress function.
-- The previous version used a single ON CONFLICT clause that was incompatible
-- with the new partial unique indexes.
-- This version introduces an IF/ELSE block to handle TV shows and movies separately,
-- using the correct ON CONFLICT target for each case. This ensures that inserts
-- and updates work reliably for all media types.

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
        -- Handle TV shows and anime (with season/episode)
        INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET
            progress_seconds = p_progress_seconds,
            duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
            updated_at = now();

        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET watched_at = now();
    ELSE
        -- Handle movies (without season/episode)
        INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
        VALUES (auth.uid(), p_media_id, p_media_type, NULL, NULL, p_progress_seconds, p_duration_seconds, now())
        ON CONFLICT (user_id, media_id, media_type) WHERE episode_number IS NULL
        DO UPDATE SET
            progress_seconds = p_progress_seconds,
            duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
            updated_at = now();

        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, NULL, NULL, now())
        ON CONFLICT (user_id, media_id, media_type) WHERE episode_number IS NULL
        DO UPDATE SET watched_at = now();
    END IF;
END;
$function$;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION public.save_watch_progress(text, text, int, int, int, int, boolean) TO authenticated; 