create table if not exists brand_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  website text,
  instagram_handle text,
  product_count text,
  annual_revenue text,
  why_qoyl text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table brand_applications enable row level security;

-- The /apply form is public and unauthenticated, matching the app's
-- other public-facing forms (e.g. qoyl-beta's product_requests).
create policy "Allow anon insert"
  on brand_applications for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on brand_applications for insert
  to authenticated
  with check (true);

-- No select policy -- applications (email, why_qoyl, etc.) are only
-- readable via /admin, which uses the service role key server-side.
