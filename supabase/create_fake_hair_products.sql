-- A fake hair brand's own products, each tied to the style it's meant to
-- feature in (styles is qoyl-beta's Style Match reference catalog, shared
-- in this same Supabase project). One row per product+style pairing --
-- if a product suits multiple styles, add it again with a different
-- style_id rather than modeling a many-to-many join table, matching this
-- project's preference for the simplest structure that fits (see
-- brand_products' single `category` column for the same reasoning).
create table if not exists fake_hair_products (
  id uuid primary key default gen_random_uuid(),
  brand_id uuid references fake_hair_brand_accounts(id),
  style_id uuid references styles(id),
  product_name text not null,
  product_url text,
  created_at timestamptz not null default now()
);

alter table fake_hair_products enable row level security;

-- Same pattern as brand_products_policies.sql: the brand's own dashboard
-- reads/writes these directly from the browser under their logged-in
-- session, scoped to their own fake_hair_brand_accounts row by email.
create policy "Fake hair brand can select own products"
  on fake_hair_products for select
  to authenticated
  using (
    brand_id in (
      select id from fake_hair_brand_accounts where email = (auth.jwt() ->> 'email')
    )
  );

create policy "Fake hair brand can insert own products"
  on fake_hair_products for insert
  to authenticated
  with check (
    brand_id in (
      select id from fake_hair_brand_accounts where email = (auth.jwt() ->> 'email')
    )
  );
