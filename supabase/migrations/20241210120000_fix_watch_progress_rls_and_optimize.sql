-- Fix and optimize RLS policies for watch progress and history
-- This migration ensures that users can only access their own data

-- Drop existing policies to recreate them properly
DROP POLICY IF EXISTS "Users can view own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can insert own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can update own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can delete own watch progress" ON public.watch_progress;

DROP POLICY IF EXISTS "Users can view own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can delete own watch history" ON public.watch_history;

-- Ensure RLS is enabled on both tables
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Create comprehensive RLS policies for watch_progress
CREATE POLICY "Users can view own watch progress" ON public.watch_progress
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch progress" ON public.watch_progress
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch progress" ON public.watch_progress
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch progress" ON public.watch_progress
    FOR DELETE USING (auth.uid() = user_id);

-- Create comprehensive RLS policies for watch_history
CREATE POLICY "Users can view own watch history" ON public.watch_history
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own watch history" ON public.watch_history
    FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own watch history" ON public.watch_history
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own watch history" ON public.watch_history
    FOR DELETE USING (auth.uid() = user_id);

-- Create indexes to improve performance
CREATE INDEX IF NOT EXISTS idx_watch_progress_user_media ON public.watch_progress(user_id, media_id, media_type, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_watch_progress_updated_at ON public.watch_progress(user_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_watch_history_user_media ON public.watch_history(user_id, media_id, media_type, season_number, episode_number);
CREATE INDEX IF NOT EXISTS idx_watch_history_watched_at ON public.watch_history(user_id, watched_at DESC);

-- Add unique constraint to prevent duplicate progress entries
-- Drop existing constraint if it exists
ALTER TABLE public.watch_progress DROP CONSTRAINT IF EXISTS unique_user_media_progress;

-- Add proper unique constraint
ALTER TABLE public.watch_progress 
ADD CONSTRAINT unique_user_media_progress 
UNIQUE (user_id, media_id, media_type, season_number, episode_number);

-- Add unique constraint to prevent duplicate history entries
-- Drop existing constraint if it exists
ALTER TABLE public.watch_history DROP CONSTRAINT IF EXISTS unique_user_media_history;

-- Add proper unique constraint
ALTER TABLE public.watch_history 
ADD CONSTRAINT unique_user_media_history 
UNIQUE (user_id, media_id, media_type, season_number, episode_number);

-- Grant necessary permissions to authenticated users
GRANT ALL ON public.watch_progress TO authenticated;
GRANT ALL ON public.watch_history TO authenticated;

-- Grant usage on sequences
GRANT USAGE, SELECT ON SEQUENCE public.watch_progress_id_seq TO authenticated;
GRANT USAGE, SELECT ON SEQUENCE public.watch_history_id_seq TO authenticated; 