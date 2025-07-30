-- Drop the old delete_watch_item function that accepts integer media_id
-- Keep the newer function that accepts text media_id to match database schema
-- This resolves the function overloading conflict

DROP FUNCTION IF EXISTS public.delete_watch_item(p_media_id integer, p_media_type text, p_season_number integer, p_episode_number integer);

-- The function with text media_id parameter remains active:
-- public.delete_watch_item(p_media_id text, p_media_type text, p_season_number integer, p_episode_number integer)