alter table "public"."profiles" drop constraint "profiles_username_key";

drop function if exists "public"."save_watch_progress"(p_media_id integer, p_media_type text, p_season_number integer, p_episode_number integer, p_progress_seconds integer);

drop function if exists "public"."save_watch_progress"(p_media_id integer, p_media_type text, p_season_number integer, p_episode_number integer, p_progress_seconds integer, p_duration_seconds integer);

drop index if exists "public"."profiles_username_key";

create table "public"."push_subscriptions" (
    "id" uuid not null default gen_random_uuid(),
    "user_id" uuid not null,
    "subscription" jsonb not null,
    "created_at" timestamp with time zone not null default now()
);


alter table "public"."push_subscriptions" enable row level security;

alter table "public"."favorites" alter column "created_at" drop not null;

alter table "public"."favorites" alter column "media_id" set data type integer using "media_id"::integer;

alter table "public"."favorites" alter column "user_id" drop not null;

alter table "public"."profiles" drop column "website";

alter table "public"."watch_history" alter column "watched_at" set default now();

alter table "public"."watch_progress" alter column "updated_at" set default now();

CREATE UNIQUE INDEX favorites_user_id_media_type_media_id_key ON public.favorites USING btree (user_id, media_type, media_id);

CREATE INDEX idx_push_subscriptions_user_id ON public.push_subscriptions USING btree (user_id);

CREATE UNIQUE INDEX push_subscriptions_pkey ON public.push_subscriptions USING btree (id);

CREATE UNIQUE INDEX watch_history_unique_entry ON public.watch_history USING btree (user_id, media_id, media_type, COALESCE(season_number, 0), COALESCE(episode_number, 0));

CREATE UNIQUE INDEX watch_progress_unique_entry ON public.watch_progress USING btree (user_id, media_id, media_type, COALESCE(season_number, 0), COALESCE(episode_number, 0));

alter table "public"."push_subscriptions" add constraint "push_subscriptions_pkey" PRIMARY KEY using index "push_subscriptions_pkey";

alter table "public"."favorites" add constraint "favorites_user_id_media_type_media_id_key" UNIQUE using index "favorites_user_id_media_type_media_id_key";

alter table "public"."push_subscriptions" add constraint "push_subscriptions_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."push_subscriptions" validate constraint "push_subscriptions_user_id_fkey";

alter table "public"."watch_history" add constraint "watch_history_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."watch_history" validate constraint "watch_history_user_id_fkey";

alter table "public"."watch_progress" add constraint "watch_progress_user_id_fkey" FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE not valid;

alter table "public"."watch_progress" validate constraint "watch_progress_user_id_fkey";

grant delete on table "public"."push_subscriptions" to "anon";

grant insert on table "public"."push_subscriptions" to "anon";

grant references on table "public"."push_subscriptions" to "anon";

grant select on table "public"."push_subscriptions" to "anon";

grant trigger on table "public"."push_subscriptions" to "anon";

grant truncate on table "public"."push_subscriptions" to "anon";

grant update on table "public"."push_subscriptions" to "anon";

grant delete on table "public"."push_subscriptions" to "authenticated";

grant insert on table "public"."push_subscriptions" to "authenticated";

grant references on table "public"."push_subscriptions" to "authenticated";

grant select on table "public"."push_subscriptions" to "authenticated";

grant trigger on table "public"."push_subscriptions" to "authenticated";

grant truncate on table "public"."push_subscriptions" to "authenticated";

grant update on table "public"."push_subscriptions" to "authenticated";

grant delete on table "public"."push_subscriptions" to "service_role";

grant insert on table "public"."push_subscriptions" to "service_role";

grant references on table "public"."push_subscriptions" to "service_role";

grant select on table "public"."push_subscriptions" to "service_role";

grant trigger on table "public"."push_subscriptions" to "service_role";

grant truncate on table "public"."push_subscriptions" to "service_role";

grant update on table "public"."push_subscriptions" to "service_role";

create policy "Users can insert their own profile"
on "public"."profiles"
as permissive
for insert
to public
with check ((auth.uid() = id));


create policy "Users can update their own profile"
on "public"."profiles"
as permissive
for update
to public
using ((auth.uid() = id));


create policy "Users can view their own profile"
on "public"."profiles"
as permissive
for select
to public
using ((auth.uid() = id));


create policy "Users can manage their own push subscriptions"
on "public"."push_subscriptions"
as permissive
for all
to public
using ((auth.uid() = user_id))
with check ((auth.uid() = user_id));



