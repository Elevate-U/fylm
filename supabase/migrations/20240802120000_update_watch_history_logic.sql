-- Function to save watch progress and history in one transaction
create or replace function save_watch_progress(
    p_media_id int,
    p_media_type text,
    p_season_number int,
    p_episode_number int,
    p_progress_seconds int
)
returns void as $$
begin
    -- Upsert watch progress
    insert into public.watch_progress (user_id, media_id, media_type, season_number, episode_number, progress_seconds, updated_at)
    values (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, p_progress_seconds, now())
    on conflict (user_id, media_id, media_type, season_number, episode_number)
    do update set progress_seconds = p_progress_seconds, updated_at = now();

    -- Add to watch history if progress is significant (e.g., > 60s)
    if p_progress_seconds > 60 then
        insert into public.watch_history (user_id, media_id, media_type, season_number, episode_number, watched_at)
        values (auth.uid(), p_media_id, p_media_type, p_season_number, p_episode_number, now())
        on conflict (user_id, media_id, media_type, season_number, episode_number)
        do update set watched_at = now();
    end if;
end;
$$ language plpgsql;

-- Function to delete watch history and progress for an item
create or replace function delete_watch_item(
    p_media_id int,
    p_media_type text,
    p_season_number int,
    p_episode_number int
)
returns void as $$
begin
    delete from public.watch_progress
    where user_id = auth.uid()
      and media_id = p_media_id
      and media_type = p_media_type
      and season_number = p_season_number
      and episode_number = p_episode_number;

    delete from public.watch_history
    where user_id = auth.uid()
      and media_id = p_media_id
      and media_type = p_media_type
      and season_number = p_season_number
      and episode_number = p_episode_number;
end;
$$ language plpgsql;


-- Add a policy to allow users to delete their own watch history
-- This assumes you want users to be able to delete their history.
-- If not, you can remove this policy and the delete_watch_item function.
drop policy if exists "Users can delete their own watch history" on public.watch_history;
create policy "Users can delete their own watch history" on public.watch_history
  for delete using ((select auth.uid()) = user_id);

-- Add a policy to allow users to delete their own watch progress
drop policy if exists "Users can delete their own watch progress" on public.watch_progress;
create policy "Users can delete their own watch progress" on public.watch_progress
  for delete using ((select auth.uid()) = user_id); 