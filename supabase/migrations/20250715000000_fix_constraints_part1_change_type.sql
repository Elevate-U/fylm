-- Alter watch_history to change media_id to text
ALTER TABLE public.watch_history
ALTER COLUMN media_id TYPE TEXT;

-- Alter watch_progress to change media_id to text
ALTER TABLE public.watch_progress
ALTER COLUMN media_id TYPE TEXT; 