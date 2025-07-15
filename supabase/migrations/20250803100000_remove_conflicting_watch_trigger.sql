-- This migration removes the legacy `handle_unique_violation` trigger, which has been
-- superseded by the `ON CONFLICT` logic within the `save_watch_progress` function.
-- The trigger's presence creates a deadlock with the function, causing timeouts.
-- Removing it is the definitive fix for the watch history and progress saving issue.

-- Step 1: Drop the trigger from the watch_progress table if it exists.
DROP TRIGGER IF EXISTS trigger_handle_unique_violation_progress ON public.watch_progress;

-- Step 2: Drop the trigger from the watch_history table if it exists.
DROP TRIGGER IF EXISTS trigger_handle_unique_violation_history ON public.watch_history;

-- Step 3: Drop the trigger function itself, as it is no longer needed.
-- Use CASCADE to remove any dependent objects that might be lingering.
DROP FUNCTION IF EXISTS public.handle_unique_violation() CASCADE;

-- End of migration to remove conflicting trigger. 