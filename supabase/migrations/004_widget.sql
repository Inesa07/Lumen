-- =====================================================================================
-- Lumen · version 4: data for the macOS widget
-- Run once: Supabase → SQL Editor → New query → paste → Run.
-- =====================================================================================
-- The widget on the Mac desktop can't log in like the browser. Instead:
--   1. In Lumen (Settings → Mac widget) you press "Connect widget". The browser makes a long random
--      secret (the widget key), shows it ONCE, and saves only its SHA-256 hash here.
--   2. While Lumen is open, the browser keeps a small summary up to date in "summary"
--      (today's focus, goal, streak, mood, Lumi, quest). It is computed by the same code as the pages.
--   3. The Edge Function "widget" receives the key from the widget, hashes it, finds the row and
--      returns ONLY this summary. The key can't read or change anything else.

create table if not exists public.widget (
  user_id    uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  token_hash text unique,
  summary    jsonb,
  updated_at timestamptz not null default now()
);
alter table public.widget enable row level security;
drop policy if exists "own widget row" on public.widget;
create policy "own widget row" on public.widget for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
revoke all on public.widget from anon;
grant select, insert, update, delete on public.widget to authenticated;

-- The Edge Function reads the summary through this function, with the public key (no service key
-- needed). It returns the summary only for the exact SHA-256 hash of a widget key; nobody can list
-- rows or read anything else. "security definer" lets it read the table that anon can't read.
create or replace function public.widget_summary(key_hash text)
returns jsonb
language sql
security definer
set search_path = ''
as $$
  select summary || jsonb_build_object('updated_at', updated_at)
  from public.widget where token_hash = key_hash limit 1
$$;
revoke all on function public.widget_summary(text) from public;
grant execute on function public.widget_summary(text) to anon, authenticated;
