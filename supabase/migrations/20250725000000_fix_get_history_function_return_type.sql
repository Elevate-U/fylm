-- This migration fixes a data type mismatch in the get_watch_history_with_progress function.
-- The watch_progress table stores progress as a 'real' (decimal), but the function was
-- declared to return an 'integer'. This change casts the decimal values to integers,
-- ensuring the returned data structure matches the function's signature.

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
        -- Cast the real/float values to integer to match the return type
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

-- Set the search path to ensure the function can find tables in the public schema
ALTER FUNCTION get_watch_history_with_progress() SET search_path = public;

-- Re-grant permissions to be safe
GRANT EXECUTE ON FUNCTION get_watch_history_with_progress() TO authenticated; 