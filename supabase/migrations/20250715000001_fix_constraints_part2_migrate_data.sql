-- Drop old constraints if they exist
DO $$
BEGIN
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'watch_history_unique_entry'
    ) THEN
        ALTER TABLE watch_history DROP CONSTRAINT watch_history_unique_entry;
        RAISE NOTICE 'Dropped old watch_history_unique_entry constraint';
    ELSE
        RAISE NOTICE 'watch_history_unique_entry constraint does not exist';
    END IF;
    
    IF EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'watch_progress_unique_entry'
    ) THEN
        ALTER TABLE watch_progress DROP CONSTRAINT watch_progress_unique_entry;
        RAISE NOTICE 'Dropped old watch_progress_unique_entry constraint';
    ELSE
        RAISE NOTICE 'watch_progress_unique_entry constraint does not exist';
    END IF;
END $$;

-- Create new constraints with distinct names
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'watch_history_unique_v2'
    ) THEN
        ALTER TABLE watch_history
        ADD CONSTRAINT watch_history_unique_v2
        UNIQUE (user_id, media_id, media_type, season_number, episode_number);
        RAISE NOTICE 'Created watch_history_unique_v2 constraint';
    ELSE
        RAISE NOTICE 'watch_history_unique_v2 constraint already exists';
    END IF;
    
    IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'watch_progress_unique_v2'
    ) THEN
        ALTER TABLE watch_progress
        ADD CONSTRAINT watch_progress_unique_v2
        UNIQUE (user_id, media_id, media_type, season_number, episode_number);
        RAISE NOTICE 'Created watch_progress_unique_v2 constraint';
    ELSE
        RAISE NOTICE 'watch_progress_unique_v2 constraint already exists';
    END IF;
END $$;

-- Migration function to update existing media IDs
CREATE OR REPLACE FUNCTION migrate_media_ids() RETURNS void AS $$
DECLARE
    rec record;
    new_id text;
BEGIN
    -- Update watch_history for numeric media_ids
    FOR rec IN SELECT * FROM watch_history WHERE media_id::text ~ '^[0-9]+$' LOOP
        new_id := 'tmdb:' || rec.media_id::text || ':null:null';
        UPDATE watch_history
        SET media_id = new_id
        WHERE id = rec.id;
    END LOOP;

    -- Update watch_progress for numeric media_ids
    FOR rec IN SELECT * FROM watch_progress WHERE media_id::text ~ '^[0-9]+$' LOOP
        new_id := 'tmdb:' || rec.media_id::text || ':null:null';
        UPDATE watch_progress
        SET media_id = new_id
        WHERE id = rec.id;
    END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Execute migration
SELECT migrate_media_ids();

-- Drop temporary function
DROP FUNCTION migrate_media_ids();

-- Create function to handle constraint violations
CREATE OR REPLACE FUNCTION handle_unique_violation() 
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql;

-- Create triggers
CREATE TRIGGER watch_history_upsert
BEFORE INSERT ON watch_history
FOR EACH ROW EXECUTE FUNCTION handle_unique_violation();

CREATE TRIGGER watch_progress_upsert
BEFORE INSERT ON watch_progress
FOR EACH ROW EXECUTE FUNCTION handle_unique_violation();