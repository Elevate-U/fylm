-- This migration fixes security warnings related to function search paths.

-- 1. Update save_watch_progress function
-- This version includes the fix from 20250719000001 (changing media_id to text)
-- and adds the recommended security setting for search_path.
CREATE OR REPLACE FUNCTION public.save_watch_progress(
    p_media_id text,
    p_media_type text,
    p_season_number integer,
    p_episode_number integer,
    p_progress_seconds integer,
    p_duration_seconds integer DEFAULT NULL,
    p_force_history_entry boolean DEFAULT false
)
RETURNS void
LANGUAGE plpgsql
AS $function$
BEGIN
    -- Upsert watch progress
    INSERT INTO public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, duration_seconds, updated_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, p_duration_seconds, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET
        progress_seconds = p_progress_seconds,
        duration_seconds = COALESCE(p_duration_seconds, public.watch_progress.duration_seconds),
        updated_at = now();

    -- Always create a history entry to mark that it was watched
    INSERT INTO public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
    VALUES (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
    ON CONFLICT (user_id, media_id, media_type, season_number, episode_number)
    DO UPDATE SET watched_at = now();
END;
$function$;
ALTER FUNCTION public.save_watch_progress(text, text, integer, integer, integer, integer, boolean) SET search_path = public;

-- 2. Update handle_unique_violation trigger function
-- This adds the recommended security setting for search_path.
CREATE OR REPLACE FUNCTION public.handle_unique_violation()
RETURNS trigger
LANGUAGE plpgsql
AS $function$
BEGIN
    IF TG_OP = 'INSERT' THEN
        -- Update existing record on violation
        IF TG_TABLE_NAME = 'watch_history' THEN
            UPDATE watch_history SET
                watched_at = NEW.watched_at
            WHERE user_id = NEW.user_id
            AND media_id = NEW.media_id
            AND media_type = NEW.media_type
            AND season_number IS NOT DISTINCT FROM NEW.season_number
            AND episode_number IS NOT DISTINCT FROM NEW.episode_number;
            RETURN NULL;
        ELSIF TG_TABLE_NAME = 'watch_progress' THEN
            UPDATE watch_progress SET
                progress_seconds = NEW.progress_seconds,
                duration_seconds = NEW.duration_seconds,
                updated_at = NOW()
            WHERE user_id = NEW.user_id
            AND media_id = NEW.media_id
            AND media_type = NEW.media_type
            AND season_number IS NOT DISTINCT FROM NEW.season_number
            AND episode_number IS NOT DISTINCT FROM NEW.episode_number;
            RETURN NULL;
        END IF;
    END IF;
    RETURN NEW;
EXCEPTION
    WHEN others THEN
        -- Log error but allow operation to continue
        RAISE WARNING 'Constraint violation handling failed: %', SQLERRM;
        RETURN NEW;
END;
$function$;
ALTER FUNCTION public.handle_unique_violation() SET search_path = public; 