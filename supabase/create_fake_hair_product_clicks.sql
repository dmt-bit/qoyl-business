-- Click-through tracking for fake_hair_products. Schema only for now --
-- nothing writes to this table yet. Populating it requires qoyl-beta's
-- Style Match shopping-list generator (lib/styleShoppingList.ts) to
-- actually surface a brand's registered product instead of a generic
-- Amazon search link, and to log a click here when a consumer follows
-- it. That consumer-facing wiring is a deliberately separate follow-up
-- (see the qoyl-business dashboard's "awaiting integration" note) --
-- this table just makes sure the dashboard has something real to query
-- once that instrumentation exists, rather than adding it later.
create table if not exists fake_hair_product_clicks (
  id uuid primary key default gen_random_uuid(),
  product_id uuid references fake_hair_products(id),
  clicked_at timestamptz not null default now()
);

alter table fake_hair_product_clicks enable row level security;

-- No policies yet -- locked to service-role access until the qoyl-beta
-- click instrumentation above exists and we know what role should be
-- allowed to insert (almost certainly anon, mirroring product_searches).
