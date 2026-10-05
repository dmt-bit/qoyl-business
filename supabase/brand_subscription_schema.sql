-- Brand subscription + dashboard schema. Run in the Supabase SQL editor
-- (DDL can't run through the JS client). Safe to re-run: every statement
-- is IF NOT EXISTS.
--
-- Already in the live database (no-ops here): brand_accounts.stripe_customer_id,
-- brand_accounts.stripe_subscription_id, brand_accounts.tier,
-- brand_accounts.subscription_tier.
--
-- Required before the Stripe webhook (app/api/webhooks/brand-stripe) is live:
-- the activation update writes activated_at and plan_tier/plan_price_cents.

ALTER TABLE brand_accounts
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_subscription_id text,
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'early_stage'
    CHECK (plan_tier IN ('early_stage', 'growth', 'enterprise')),
  ADD COLUMN IF NOT EXISTS plan_price_cents integer NOT NULL DEFAULT 5000,  -- 5000 = $50.00
  ADD COLUMN IF NOT EXISTS activated_at timestamptz,
  ADD COLUMN IF NOT EXISTS dashboard_last_viewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS score_report_sent_at timestamptz;

-- Brand -> catalog product links (the spec's brand_catalog_products, renamed:
-- brand_catalog_products already exists with brand-sold products).
CREATE TABLE IF NOT EXISTS brand_product_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_account_id uuid NOT NULL REFERENCES brand_accounts(id) ON DELETE CASCADE,
  catalog_product_id uuid NOT NULL REFERENCES catalog_products(id) ON DELETE CASCADE,
  is_primary boolean NOT NULL DEFAULT false,  -- first product to score
  added_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (brand_account_id, catalog_product_id)
);

-- Service role only (admin + dashboard API). No anon/authenticated policies.
ALTER TABLE brand_product_links ENABLE ROW LEVEL SECURITY;
