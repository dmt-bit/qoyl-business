create table if not exists brand_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references brand_accounts(id),
  product_name text not null,
  category text
    check (category in ('shampoo', 'conditioner', 'leave-in', 'styler', 'treatment', 'oil', 'other')),
  ingredient_list text,
  created_at timestamptz not null default now()
);

alter table brand_products enable row level security;

-- No policies yet -- this table isn't read or written by any page built
-- this session. Locked to service-role access until the brand product
-- intelligence modules are built next session.
