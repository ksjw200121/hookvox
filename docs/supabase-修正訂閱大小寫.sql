-- Fix legacy subscription plan/status formatting
-- Run in Supabase SQL editor (production project).

begin;

update subscriptions
set
  plan = upper(trim(plan)),
  status = upper(trim(status)),
  "updatedAt" = now()
where
  plan is not null
  and (plan <> upper(trim(plan)) or status <> upper(trim(status)));

commit;

-- Optional sanity check:
-- select plan, status, count(*) from subscriptions group by plan, status order by count(*) desc;

