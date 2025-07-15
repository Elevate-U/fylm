-- This migration normalizes the media_id column in the watch_history and watch_progress
-- tables to ensure all entries use a simple numeric ID. This fixes the "continue watching"
-- duplication bug caused by inconsistent data formats (e.g., 'tmdb:123' vs '123').

-- Step 1: Normalize the watch_history table.
-- This finds any media_id that contains a ':' and extracts the second part (the number).
UPDATE public.watch_history
SET media_id = split_part(media_id, ':', 2)
WHERE media_id LIKE '%:%';

-- Step 2: Normalize the watch_progress table.
UPDATE public.watch_progress
SET media_id = split_part(media_id, ':', 2)
WHERE media_id LIKE '%:%';

-- End of data normalization migration. 