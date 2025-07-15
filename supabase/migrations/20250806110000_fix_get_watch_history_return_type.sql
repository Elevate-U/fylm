--This migration corrects the return type of the get_watch_history_with_progress function.
--The progress_seconds and duration_seconds columns are cast to integer to match the function's return signature.

CREATE OR REPLACE FUNCTION public.get_watch_history_with_progress()
RETURNS TABLE (
    id bigint,
    user_id uuid,
    media_id text,
    media_type text,
    season_number int,
    episode_number int,
    watched_at timestamp with time zone,
    progress_seconds int,
    duration_seconds int
)
AS $$
BEGIN
    RETURN QUERY
    SELECT
        wh.id,
        wh.user_id,
        wh.media_id,
        wh.media_type,
        wh.season_number,
        wh.episode_number,
        wh.watched_at,
        CAST(wp.progress_seconds AS integer),
        CAST(wp.duration_seconds AS integer)
    FROM
        public.watch_history AS wh
    LEFT JOIN
        public.watch_progress AS wp ON wh.user_id = wp.user_id
        AND wh.media_id = wp.media_id
        AND wh.media_type = wp.media_type
        AND wh.season_number IS NOT DISTINCT FROM wp.season_number
        AND wh.episode_number IS NOT DISTINCT FROM wp.episode_number
    WHERE
        wh.user_id = auth.uid()
    ORDER BY
        wh.watched_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER FUNCTION public.get_watch_history_with_progress() SET search_path = public;
GRANT EXECUTE ON FUNCTION get_watch_history_with_progress() TO authenticated; 