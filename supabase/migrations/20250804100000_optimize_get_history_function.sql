-- This migration replaces the get_watch_history_with_progress function
-- with a more efficient and correct version that uses a window function
-- to ensure only the single most recent history entry per media item is returned.
-- This is the definitive fix for the "continue watching" duplication issue.

-- Step 1: Drop the old function to ensure a clean replacement.
DROP FUNCTION IF EXISTS public.get_watch_history_with_progress();

-- Step 2: Create the new, optimized function.
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
    WITH ranked_history AS (
        SELECT
            wh.id,
            wh.user_id,
            wh.media_id,
            wh.media_type,
            wh.season_number,
            wh.episode_number,
            wh.watched_at,
            wp.progress_seconds,
            wp.duration_seconds,
            -- Assign a row number to each history entry, partitioned by media item.
            -- The most recent entry for each item gets row number 1.
            ROW_NUMBER() OVER(PARTITION BY wh.media_id, wh.media_type ORDER BY wh.watched_at DESC) as rn
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
    )
    -- Only return the rows where the row number is 1 (the most recent entry).
    SELECT
        rh.id,
        rh.user_id,
        rh.media_id,
        rh.media_type,
        rh.season_number,
        rh.episode_number,
        rh.watched_at,
        CAST(rh.progress_seconds AS integer),
        CAST(rh.duration_seconds AS integer)
    FROM ranked_history rh
    WHERE rn = 1
    ORDER BY
        rh.watched_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Set the search path and grant permissions.
ALTER FUNCTION public.get_watch_history_with_progress() SET search_path = public;
GRANT EXECUTE ON FUNCTION get_watch_history_with_progress() TO authenticated; 