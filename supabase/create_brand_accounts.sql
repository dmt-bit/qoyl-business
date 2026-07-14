create table if not exists brand_accounts (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null unique,
  website text,
  instagram_handle text,
  tier text not null default 'early_stage'
    check (tier in ('early_stage', 'growth', 'enterprise')),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'active', 'suspended')),
  stripe_customer_id text,
  stripe_subscription_id text,
  approved_at timestamptz,
  created_at timestamptz not null default now()
);

alter table brand_accounts enable row level security;

-- Rows are only ever written by the admin approval flow, which runs
-- server-side with the service role key (bypasses RLS) -- no insert/
-- update policy is needed here.

-- The dashboard reads its own row client-side using the logged-in
-- brand user's session. There's no user_id FK to auth.users, so the
-- match is done on email, which is unique on this table and expected
-- to equal the Supabase Auth user's email.
create policy "Brand can read own account by email"
  on brand_accounts for select
  to authenticated
  using ((auth.jwt() ->> 'email') = email);
