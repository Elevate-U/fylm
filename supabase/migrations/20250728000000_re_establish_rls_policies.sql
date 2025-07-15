-- This migration re-establishes the necessary Row Level Security (RLS) policies
-- for the watch_progress and watch_history tables. These policies ensure that
-- users can only access and modify their own data. This is critical for the
-- save_watch_progress function to work correctly.

-- Ensure RLS is enabled on both tables, in case it was disabled.
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Drop any existing policies to prevent conflicts and ensure a clean state.
DROP POLICY IF EXISTS "Users can view own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can insert own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can update own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can delete own watch progress" ON public.watch_progress;

DROP POLICY IF EXISTS "Users can view own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can delete own watch history" ON public.watch_history;

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

-- Grant necessary permissions to the 'authenticated' role
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_progress TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.watch_history TO authenticated; 