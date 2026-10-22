-- =====================================================================================
-- Lumen · database schema, version 1
-- Run once: Supabase dashboard → SQL Editor → New query → paste everything → Run.
-- Running it again is safe (everything is "if not exists" / "or replace").
-- =====================================================================================
--
-- Idea: the app keeps every record as a JSON document (column `data`), exactly like the
-- browser does. That keeps the app simple and lets it change without database migrations.
-- A few fields are copied out of the JSON into normal columns ("generated columns"), so you
-- can still analyse your data with plain SQL, e.g.
--     select class, round(avg(avg_attention)) from sessions group by class;
--
-- Security: Row Level Security (RLS). Every table has one policy:
--     a signed-in user may read and write ONLY the rows whose user_id is their own id.
-- auth.uid() is the id of the user who sent the request (taken from their login token).
-- The public ("anon") role gets no access at all.

-- -------------------------------------------------------------------- lesson reports
create table if not exists public.sessions (
  user_id        uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id             text        not null,
  data           jsonb       not null,
  updated_at     timestamptz not null default now(),
  class          text             generated always as (data ->> 'class') stored,
  title          text             generated always as (data ->> 'title') stored,
  started_at     double precision generated always as ((data ->> 'started_at')::double precision) stored,
  duration_sec   integer          generated always as ((data ->> 'duration_sec')::integer) stored,
  avg_attention  integer          generated always as ((data ->> 'avg_attention')::integer) stored,
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- class to-do lists
create table if not exists public.todos (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  class      text    generated always as (data ->> 'class') stored,
  done       boolean generated always as ((data ->> 'done')::boolean) stored,
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- sticky notes
create table if not exists public.notes (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  lesson_id  text generated always as (data ->> 'lesson_id') stored,
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- AI tutor chats
create table if not exists public.chats (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  title      text generated always as (data ->> 'title') stored,
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- review cards (spaced repetition)
create table if not exists public.reviews (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  class      text             generated always as (data ->> 'class') stored,
  due        double precision generated always as ((data ->> 'due')::double precision) stored,
  done       boolean          generated always as ((data ->> 'done')::boolean) stored,
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- accuracy checks
create table if not exists public.checks (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- settings, personal profile (key -> value)
create table if not exists public.kv (
  user_id    uuid        not null default auth.uid() references auth.users (id) on delete cascade,
  id         text        not null,
  data       jsonb       not null,
  updated_at timestamptz not null default now(),
  primary key (user_id, id)
);

-- -------------------------------------------------------------------- security: the same rules for every table
do $$
declare t text;
begin
  foreach t in array array['sessions', 'todos', 'notes', 'chats', 'reviews', 'checks', 'kv'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists "own rows only" on public.%I', t);
    -- (select auth.uid()) instead of auth.uid(): Postgres computes it once per query, not once per row
    execute format('create policy "own rows only" on public.%I for all to authenticated
                      using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id)', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
  end loop;
end $$;

-- -------------------------------------------------------------------- "Delete my account"
-- A user can delete their own account. All their rows disappear too ("on delete cascade" above).
-- security definer = the function runs with the rights of its owner, who may delete from auth.users;
-- the function itself only ever deletes the caller's own account.
create or replace function public.delete_my_account()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from auth.users where id = auth.uid();
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
