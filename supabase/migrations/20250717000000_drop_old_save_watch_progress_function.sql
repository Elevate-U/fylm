-- Drop the old function signature that accepts an integer for media_id
DROP FUNCTION IF EXISTS public.save_watch_progress(integer, text, integer, integer, integer, integer, boolean); 