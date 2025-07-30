-- Recreate the delete_watch_item function that was accidentally dropped
-- This function deletes watch history and progress for a specific item

CREATE OR REPLACE FUNCTION delete_watch_item(
    p_media_id text,
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