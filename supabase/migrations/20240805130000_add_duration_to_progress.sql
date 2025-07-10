-- Add duration column to watch_progress table
ALTER TABLE public.watch_progress ADD COLUMN IF NOT EXISTS duration_seconds INT;

-- Update the function to include duration
CREATE OR REPLACE FUNCTION save_watch_progress(
    p_media_id int,
    p_media_type text,
    p_season_number int,
    p_episode_number int,
    p_progress_seconds int,
    p_duration_seconds int DEFAULT null
)
RETURNS void AS $$
BEGIN
    -- Upsert watch progress
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        -- Only update duration if a new one is provided
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    -- Add to watch history if progress is significant (e.g., > 60s)
    IF p_progress_seconds > 60 THEN
        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET watched_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql; 