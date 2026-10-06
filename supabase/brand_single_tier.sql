-- Single brand plan ($50/month). Run in the Supabase SQL editor after
-- brand_self_serve.sql. Idempotent.
--
-- No columns are removed: brand_accounts.tier / plan_tier stay and are set to
-- 'early_stage' for every brand (the only value now in use).

-- "How did you find qoyl?" from the apply form.
alter table brand_applications add column if not exists source text;
