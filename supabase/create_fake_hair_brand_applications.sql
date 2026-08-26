create table if not exists fake_hair_brand_applications (
  id uuid primary key default gen_random_uuid(),
  company_name text not null,
  contact_name text not null,
  email text not null,
  website text,
  instagram_handle text,
  product_count text,
  why_qoyl text,
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected')),
  created_at timestamptz not null default now()
);

alter table fake_hair_brand_applications enable row level security;

-- Mirrors brand_applications: /apply/fake-hair-brand is public and
-- unauthenticated.
create policy "Allow anon insert"
  on fake_hair_brand_applications for insert
  to anon
  with check (true);

create policy "Allow authenticated insert"
  on fake_hair_brand_applications for insert
  to authenticated
  with check (true);

-- No select policy -- applications are only readable via /admin, which
-- uses the service role key server-side.
