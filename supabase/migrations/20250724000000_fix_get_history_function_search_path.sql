-- Correct the function to ensure it has the correct search path
-- This prevents errors where the function cannot find tables in the 'public' schema.
ALTER FUNCTION get_watch_history_with_progress() SET search_path = public;

-- Re-grant permissions to be safe
GRANT EXECUTE ON FUNCTION get_watch_history_with_progress() TO authenticated; 