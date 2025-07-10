-- Create a new index on the user_id column in the watch_history table
CREATE INDEX ix_watch_history_user_id ON public.watch_history (user_id);

-- Drop existing RLS policies for the favorites table
DROP c "Users can view their own favorites." ON public.favorites;
DROP POLICY "Users can insert their own favorites." ON public.favorites;
DROP POLICY "Users can delete their own favorites." ON public.favorites;
DROP POLICY "Users can manage their own favorites" ON public.favorites;

-- Create new, optimized policies for the favorites table
CREATE POLICY "Users can view their own favorites" ON public.favorites
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own favorites" ON public.favorites
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can delete their own favorites" ON public.favorites
  FOR DELETE USING ((SELECT auth.uid()) = user_id);

-- Drop existing RLS policies for the watch_history table
DROP POLICY "Users can view their own watch history." ON public.watch_history;
DROP POLICY "Users can insert their own watch history." ON public.watch_history;
DROP POLICY "Users can update their own watch history." ON public.watch_history;
DROP POLICY "Users can manage their own watch history" ON public.watch_history;

-- Create new, optimized policies for the watch_history table
CREATE POLICY "Users can view their own watch history" ON public.watch_history
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own watch history" ON public.watch_history
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own watch history" ON public.watch_history
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Drop existing RLS policies for the watch_progress table
DROP POLICY "Users can view their own watch progress." ON public.watch_progress;
DROP POLICY "Users can insert their own watch progress." ON public.watch_progress;
DROP POLICY "Users can update their own watch progress." ON public.watch_progress;
DROP POLICY "Users can manage their own watch progress" ON public.watch_progress;

-- Create new, optimized policies for the watch_progress table
CREATE POLICY "Users can view their own watch progress" ON public.watch_progress
  FOR SELECT USING ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can insert their own watch progress" ON public.watch_progress
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = user_id);

CREATE POLICY "Users can update their own watch progress" ON public.watch_progress
  FOR UPDATE USING ((SELECT auth.uid()) = user_id);

-- Drop existing RLS policies for the profiles table
DROP POLICY "Users can insert their own profile." ON public.profiles;
DROP POLICY "Users can update own profile." ON public.profiles;

-- Create new, optimized policies for the profiles table
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK ((SELECT auth.uid()) = id);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING ((SELECT auth.uid()) = id); 