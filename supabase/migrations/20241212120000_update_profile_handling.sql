--
-- 1. Create a function to handle new user entries
--
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  -- First, check if a profile already exists for this user ID.
  if not exists (select 1 from public.profiles where id = new.id) then
    insert into public.profiles (id, full_name, username, avatar_url, updated_at)
    values (
      new.id,
      new.raw_user_meta_data ->> 'full_name',
      -- Extract username from email (part before @)
      split_part(new.email, '@', 1),
      new.raw_user_meta_data ->> 'avatar_url',
      now()
    );
  end if;
  return new;
end;
$$;

--
-- 2. Create a trigger to call the function when a new user is created
--
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

--
-- 3. Create a function to handle user updates
--
create or replace function public.update_user_profile()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.profiles
  set
    full_name = new.raw_user_meta_data ->> 'full_name',
    avatar_url = new.raw_user_meta_data ->> 'avatar_url',
    updated_at = now()
  where id = new.id;
  return new;
end;
$$;

--
-- 4. Create a trigger to call the function when user metadata is updated
--
create or replace trigger on_auth_user_updated
  after update of raw_user_meta_data on auth.users
  for each row execute procedure public.update_user_profile();

--
-- 5. RLS Policies for `profiles` table
--
alter table public.profiles enable row level security;

drop policy if exists "Users can view their own profile." on public.profiles;
create policy "Users can view their own profile."
on public.profiles for select
using ( auth.uid() = id );

drop policy if exists "Users can update their own profile." on public.profiles;
create policy "Users can update their own profile."
on public.profiles for update
using ( auth.uid() = id )
with check ( auth.uid() = id );

--
-- 6. RLS Policies for `avatars` storage bucket
--
-- Note: You might need to run these policies directly in the Supabase SQL editor.
-- The object path is segmented, so policies need to account for that.
--
drop policy if exists "Users can view their own avatars." on storage.objects;
create policy "Users can view their own avatars."
on storage.objects for select
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "Users can upload an avatar to their own folder." on storage.objects;
create policy "Users can upload an avatar to their own folder."
on storage.objects for insert
with check ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );

drop policy if exists "Users can update their own avatars." on storage.objects;
create policy "Users can update their own avatars."
on storage.objects for update
using ( bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1] );