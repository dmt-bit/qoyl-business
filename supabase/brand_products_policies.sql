-- brand_products was created last session with RLS enabled and no
-- policies (service-role-only). The dashboard, /products/add, and
-- /products/[id] now read and write brand_products directly from the
-- browser using the logged-in brand's session, matching the existing
-- pattern on brand_accounts (auth.jwt() ->> 'email' resolved against
-- the brand's own account row -- there's no user_id FK on either table).

create policy "Brand can select own products"
  on brand_products for select
  to authenticated
  using (
    brand_id in (
      select id from brand_accounts where email = (auth.jwt() ->> 'email')
    )
  );

create policy "Brand can insert own products"
  on brand_products for insert
  to authenticated
  with check (
    brand_id in (
      select id from brand_accounts where email = (auth.jwt() ->> 'email')
    )
  );
