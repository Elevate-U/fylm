-- Create a new index on the user_id column in the watch_history table
CREATE INDEX IF NOT EXISTS ix_watch_history_user_id ON public.watch_history (user_id);

-- Drop existing RLS policies for the watch_history table
DROP POLICY IF EXISTS "Users can view their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can manage their own watch history" ON public.watch_history;

-- Create new, optimized policies for the watch_history table
CREATE POLICY "Users can view their own watch history" ON public.watch_history
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history" ON public.watch_history
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history" ON public.watch_history
  FOR UPDATE USING (auth.uid() = user_id);

-- Drop existing RLS policies for the watch_progress table
DROP POLICY IF EXISTS "Users can view their own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can insert their own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can update their own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can manage their own watch progress" ON public.watch_progress;

-- Create new, optimized policies for the watch_progress table
CREATE POLICY "Users can view their own watch progress" ON public.watch_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch progress" ON public.watch_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch progress" ON public.watch_progress
  FOR UPDATE USING (auth.uid() = user_id); 