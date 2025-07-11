-- Alter the save_watch_progress function to set a secure search_path
CREATE OR REPLACE FUNCTION save_watch_progress(
    p_media_id int,
    p_media_type text,
    p_season_number int,
    p_episode_number int,
    p_progress_seconds int,
    p_duration_seconds int DEFAULT null,
    p_force_history_entry boolean DEFAULT false
)
RETURNS void AS $$
BEGIN
    -- Upsert watch progress
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    IF p_force_history_entry OR p_progress_seconds > 15 OR (
        SELECT progress_seconds FROM public.watch_progress 
        WHERE user_id = auth.uid() 
          AND media_id = p_media_id 
          AND media_type = p_media_type 
          AND season_number = p_season_number 
          AND episode_number = p_episode_number
    ) > p_progress_seconds + 30 THEN
        INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
        DO UPDATE SET watched_at = now();
    END IF;
END;
$$ LANGUAGE plpgsql
SET search_path = public;

-- Alter the delete_watch_item function to set a secure search_path
CREATE OR REPLACE FUNCTION delete_watch_item(
    p_media_id int,
    p_media_type text,
    p_season_number int,
    p_episode_number int
)
RETURNS void AS $$
BEGIN
    DELETE FROM public.watch_progress
    WHERE user_id = auth.uid()
      AND media_id = p_media_id
      AND media_type = p_media_type
      AND season_number = p_season_number
      AND episode_number = p_episode_number;

    DELETE FROM public.watch_history
    WHERE user_id = auth.uid()
      AND media_id = p_media_id
      AND media_type = p_media_type
      AND season_number = p_season_number
      AND episode_number = p_episode_number;
END;
$$ LANGUAGE plpgsql
SET search_path = public; 