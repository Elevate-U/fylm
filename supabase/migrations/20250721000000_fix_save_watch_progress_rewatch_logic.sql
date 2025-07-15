-- supabase/migrations/20250721000000_fix_save_watch_progress_rewatch_logic.sql
CREATE OR REPLACE FUNCTION save_watch_progress(
    p_media_id text, -- Changed to text to match client-side change
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
    v_last_watched_at timestamp with time zone;
BEGIN
    -- Get the existing progress and last watched time BEFORE the upsert
    SELECT
        progress_seconds,
        updated_at -- Using updated_at from progress as a proxy for last watched
    INTO
        v_old_progress_seconds,
        v_last_watched_at
    FROM public.watch_progress
    WHERE
        user_id = auth.uid()
        AND media_id = p_media_id
        AND media_type = p_media_type
        AND season_number IS NOT DISTINCT FROM p_season_number
        AND episode_number IS NOT DISTINCT FROM p_episode_number;

    -- Upsert watch progress. This remains the primary source of truth for progress.
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    -- Determine if an entry/update in watch_history is needed
    -- Conditions for updating history:
    -- 1. Forced by the client.
    -- 2. New item (no old progress).
    -- 3. Significant progress jump (>60s) for discoverability.
    -- 4. Rewatch detected (new progress is much less than old progress).
    -- 5. It's been a while (>5 mins) since the last history update to keep it "live".
    IF p_force_history_entry OR
       v_old_progress_seconds IS NULL OR
       p_progress_seconds > 60 OR
       (v_old_progress_seconds IS NOT NULL AND p_progress_seconds < v_old_progress_seconds - 30) OR
       (v_last_watched_at IS NOT NULL AND v_last_watched_at < now() - interval '5 minutes')
    THEN
        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET watched_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION save_watch_progress(text, text, int, int, int, int, boolean) TO authenticated; 