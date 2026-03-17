-- Fix legacy subscription plan/status formatting
-- Run in Supabase SQL editor (production project).

begin;

update subscriptions
set
  -- plan/status 可能是 enum（例如 "Plan" / "SubStatus"），先轉成 text 再 trim/upper，最後再 cast 回 enum
  plan = upper(trim(plan::text))::"Plan",
  status = upper(trim(status::text))::"SubStatus",
  "updatedAt" = now()
where
  plan is not null
  and (
    plan::text <> upper(trim(plan::text))
    or status::text <> upper(trim(status::text))
  );

commit;

-- Optional sanity check:
-- select plan, status, count(*) from subscriptions group by plan, status order by count(*) desc;

