CREATE OR REPLACE FUNCTION get_watch_history_with_progress()
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
        wp.progress_seconds,
        wp.duration_seconds
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

-- Grant execute permission to the authenticated role
GRANT EXECUTE ON FUNCTION get_watch_history_with_progress() TO authenticated; 