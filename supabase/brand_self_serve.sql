-- Self-serve brand signup (no approval step). Run in the Supabase SQL editor,
-- AFTER supabase/brand_subscription_schema.sql (this file builds on its
-- columns) and supabase/add_brand_requested_tier.sql. Idempotent.

-- brand_accounts.status: the signup flow writes 'pending_payment' and the
-- webhook / admin write 'cancelled'. The original check constraint doesn't
-- allow either, so replace it.
alter table brand_accounts drop constraint if exists brand_accounts_status_check;
alter table brand_accounts
  add constraint brand_accounts_status_check
  check (status in ('pending', 'approved', 'pending_payment', 'active', 'cancelled', 'suspended'));

alter table brand_accounts
  add column if not exists user_id uuid references auth.users(id),
  add column if not exists catalog_size text,
  add column if not exists product_to_score text,
  add column if not exists about text,
  add column if not exists payment_url text;

-- Applications are still stored for records. 'auto_approved' = the applicant
-- got their payment link straight away (no manual review).
alter table brand_applications drop constraint if exists brand_applications_status_check;
alter table brand_applications
  add constraint brand_applications_status_check
  check (status in ('pending', 'approved', 'rejected', 'auto_approved'));

alter table brand_applications
  add column if not exists product_to_score text;
