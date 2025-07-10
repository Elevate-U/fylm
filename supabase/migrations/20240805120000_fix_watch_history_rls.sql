-- Enable RLS on the tables if not already enabled
ALTER TABLE public.watch_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.watch_history ENABLE ROW LEVEL SECURITY;

-- Remove old policies to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can insert their own watch progress" ON public.watch_progress;
DROP POLICY IF EXISTS "Users can update their own watch progress" ON public.watch_progress;

DROP POLICY IF EXISTS "Users can view their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can insert their own watch history" ON public.watch_history;
DROP POLICY IF EXISTS "Users can update their own watch history" ON public.watch_history;


-- Policies for watch_progress table
CREATE POLICY "Users can view their own watch progress"
ON public.watch_progress FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch progress"
ON public.watch_progress FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch progress"
ON public.watch_progress FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policies for watch_history table
CREATE POLICY "Users can view their own watch history"
ON public.watch_history FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own watch history"
ON public.watch_history FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own watch history"
ON public.watch_history FOR UPDATE
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id); 