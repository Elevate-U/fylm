-- This migration provides the definitive fix for the watch history issue by
-- simplifying the database logic. It removes the complex, conditional checks
-- and ensures that the watch_history table is updated every time progress is saved.
-- This guarantees the "currently watching" item always stays at the top of the history.

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
    -- First, always update the detailed progress in the watch_progress table.
    -- This remains the primary source of truth for the resume point.
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    -- Second, always update the watch_history table.
    -- This ensures the watched_at timestamp is always current, keeping the item
    -- at the top of the history list. The ON CONFLICT clause handles both
    -- creating new entries and updating existing ones.
    INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET watched_at = now();
END;
$function$;

-- Set the search path and grant permissions to ensure the function works correctly
ALTER FUNCTION public.save_watch_progress(text, text, int, int, int, int, boolean) SET search_path = public;
GRANT EXECUTE ON FUNCTION public.save_watch_progress(text, text, int, int, int, int, boolean) TO authenticated;