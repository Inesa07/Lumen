-- =====================================================================================
-- Lumen · version 3: a question that failed (AI busy, network error) does not use up the daily limit
-- Run once: Supabase → SQL Editor → New query → paste → Run.
-- =====================================================================================
create or replace function public.refund_ai_quota()
returns void
language sql
security definer
set search_path = ''
as $$
  update public.ai_usage set count = greatest(count - 1, 0)
  where user_id = auth.uid() and day = current_date;
$$;
revoke all on function public.refund_ai_quota() from public, anon;
grant execute on function public.refund_ai_quota() to authenticated;
