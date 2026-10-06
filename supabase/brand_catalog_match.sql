-- Links brand accounts to the catalog brand their products live under.
-- Run in the Supabase SQL editor, in this order. Idempotent.
--
-- NOTE: the link target is catalog_brands (qoyl-beta's brand list, which
-- catalog_products.brand_id references), NOT brands (qoyl-business's own
-- partner table, which is empty and has a different schema).

-- 1. The link column
alter table brand_accounts
  add column if not exists brand_id uuid references catalog_brands(id);

-- 2. Backfill existing accounts: exact name match only, ignoring case and
--    punctuation. A fuzzy match would tie "Being" to "Being Frenshe".
update brand_accounts ba
set brand_id = cb.id
from catalog_brands cb
where ba.brand_id is null
  and lower(regexp_replace(cb.name, '[^a-zA-Z0-9]+', ' ', 'g'))
    = lower(regexp_replace(ba.company_name, '[^a-zA-Z0-9]+', ' ', 'g'));

-- 3. Product requests from brands ("add more products"), actioned in /admin.
create table if not exists brand_product_requests (
  id uuid primary key default gen_random_uuid(),
  brand_account_id uuid references brand_accounts(id) on delete cascade,
  product_name text not null,
  status text not null default 'pending'
    check (status in ('pending', 'added', 'declined')),
  created_at timestamptz not null default now()
);

-- Service role only: written and read by /api and /admin routes.
alter table brand_product_requests enable row level security;
