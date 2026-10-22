-- =====================================================================================
-- Lumen · version 2: daily limit for the free AI tutor
-- Run once: Supabase → SQL Editor → New query → paste → Run.
-- =====================================================================================
-- Every signed-in student may ask the shared AI tutor a limited number of questions per day.
-- The counter lives here; the Edge Function "tutor" asks use_ai_quota() before every question.

create table if not exists public.ai_usage (
  user_id uuid    not null default auth.uid() references auth.users (id) on delete cascade,
  day     date    not null default current_date,
  count   integer not null default 0,
  primary key (user_id, day)
);
alter table public.ai_usage enable row level security;
drop policy if exists "read own usage" on public.ai_usage;
create policy "read own usage" on public.ai_usage for select to authenticated using ((select auth.uid()) = user_id);
revoke all on public.ai_usage from anon;
grant select on public.ai_usage to authenticated;     -- students can SEE their count, but not change it

-- Adds 1 to today's counter and says whether the question is allowed.
-- "security definer": runs with the owner's rights, so it may write the counter that students can't write.
-- The upsert is one atomic statement: two questions at the same moment can't both slip past the limit.
create or replace function public.use_ai_quota(max_per_day integer)
returns table (allowed boolean, used integer)
language plpgsql
security definer
set search_path = ''
as $$
declare n integer;
begin
  if auth.uid() is null then
    return query select false, 0;
    return;
  end if;
  insert into public.ai_usage (user_id, day, count) values (auth.uid(), current_date, 1)
  on conflict (user_id, day) do update set count = public.ai_usage.count + 1
  returning count into n;
  if n > max_per_day then
    update public.ai_usage set count = count - 1 where user_id = auth.uid() and day = current_date;
    return query select false, n - 1;
  else
    return query select true, n;
  end if;
end;
$$;
revoke all on function public.use_ai_quota(integer) from public, anon;
grant execute on function public.use_ai_quota(integer) to authenticated;
