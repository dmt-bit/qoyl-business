-- Read-only access for the admin login (hey@qoyl.live) so /admin-preview/[brandId]
-- can render any brand's dashboard. Permissive policies are OR'd with the
-- existing brand-owner policies, so brands still see only their own rows.
-- Run in the Supabase SQL editor. Idempotent.

drop policy if exists "Admin can read all brand accounts" on brand_accounts;
create policy "Admin can read all brand accounts"
  on brand_accounts for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'hey@qoyl.live');

drop policy if exists "Admin can read all brand products" on brand_products;
create policy "Admin can read all brand products"
  on brand_products for select
  to authenticated
  using ((auth.jwt() ->> 'email') = 'hey@qoyl.live');
