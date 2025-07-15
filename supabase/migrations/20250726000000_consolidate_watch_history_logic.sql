-- This migration perfects the watch history logic by consolidating all updates
-- into a single, reliable database function. It removes the need for a separate
-- client-side call to add history entries, fixing logic conflicts.

CREATE OR REPLACE FUNCTION save_watch_progress(
    p_media_id text,
    p_media_type text,
    p_season_number int,
    p_episode_number int,
    p_progress_seconds int,
    p_duration_seconds int DEFAULT null,
    p_force_history_entry boolean DEFAULT false
)
RETURNS void AS $$
DECLARE
    v_old_progress_seconds int;
    v_last_history_update timestamp with time zone;
BEGIN
    -- First, get existing progress from the watch_progress table
    SELECT progress_seconds INTO v_old_progress_seconds
    FROM public.watch_progress
    WHERE
        user_id = auth.uid()
        AND media_id = p_media_id
        AND media_type = p_media_type
        AND season_number IS NOT DISTINCT FROM p_season_number
        AND episode_number IS NOT DISTINCT FROM p_episode_number;

    -- Separately, get the last update time from the watch_history table
    SELECT watched_at INTO v_last_history_update
    FROM public.watch_history
    WHERE
        user_id = auth.uid()
        AND media_id = p_media_id
        AND media_type = p_media_type
        AND season_number IS NOT DISTINCT FROM p_season_number
        AND episode_number IS NOT DISTINCT FROM p_episode_number;

    -- Always update the detailed progress in the watch_progress table
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    -- Now, intelligently decide whether to update the watch_history table.
    -- This keeps the history list sorted and relevant.
    IF
        p_force_history_entry OR
        v_last_history_update IS NULL OR -- Always create a history entry if one doesn't exist
        (v_old_progress_seconds IS NOT NULL AND p_progress_seconds < v_old_progress_seconds - 30) OR -- Handle re-watches
        (v_last_history_update < now() - interval '5 seconds') -- Update every 5 seconds to keep it "live"
    THEN
        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET watched_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Set the search path and grant permissions to ensure the function works correctly
ALTER FUNCTION save_watch_progress(text, text, int, int, int, int, boolean) SET search_path = public;
GRANT EXECUTE ON FUNCTION save_watch_progress(text, text, int, int, int, int, boolean) TO authenticated; 