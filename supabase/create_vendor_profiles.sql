-- Vendor signups from /join -> Stripe checkout -> /welcome. Run in the
-- Supabase SQL editor. Not yet run.

create table if not exists vendor_profiles (
  id uuid primary key default gen_random_uuid(),
  user_email text not null,
  plan_type text not null check (plan_type in ('stylist', 'hair-seller', 'brand')),
  business_name text,
  location text,
  -- Contact name + whichever plan-specific fields /welcome collected
  -- (hair types/textures for a seller, specialties + booking link for a
  -- stylist, product categories for a brand).
  profile_data jsonb not null default '{}'::jsonb,
  stripe_customer_id text,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table vendor_profiles enable row level security;

-- /welcome is public and unauthenticated (the vendor has no qoyl login yet
-- at this point -- they just paid via a Stripe Payment Link) -- matches the
-- other public application forms (e.g. brand_applications).
create policy "Allow anon insert"
  on vendor_profiles for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on vendor_profiles for insert
  to authenticated
  with check (true);

-- No select policy -- read via the service role only (admin review).
