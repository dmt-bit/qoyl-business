-- Intake table for /apply/stylist. stylist_accounts already exists in
-- this shared Supabase project (created outside this repo -- see
-- qoyl-beta's supabase/create_style_match.sql for that history) but has
-- no corresponding application/review table, so applications go here
-- first and get promoted into stylist_accounts on admin approval, the
-- same two-step pattern brand_applications -> brand_accounts already
-- uses.
create table if not exists stylist_applications (
  id uuid primary key default gen_random_uuid(),
  display_name text not null,
  contact_name text not null,
  email text not null,
  phone text,
  city text not null,
  neighborhood text,
  salon_name text,
  website text,
  instagram text,
  years_experience integer,
  hair_types_served text[],
  bio text,
  why_qoyl text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table stylist_applications enable row level security;

create policy "Allow anon insert"
  on stylist_applications for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on stylist_applications for insert
  to authenticated
  with check (true);

-- No select policy -- applications are only readable via /admin, which
-- uses the service role key server-side.
