-- Monthly R&D reports: brand preferences and generated drafts. Run in the
-- Supabase SQL editor. Not yet run as of this commit.

CREATE TABLE IF NOT EXISTS brand_report_preferences (
  id uuid primary key default gen_random_uuid(),
  brand_account_id uuid references brand_accounts(id) unique,
  wants_reformulation boolean default true,
  wants_segment_targeting boolean default true,
  wants_competitive boolean default false,
  wants_trend_signals boolean default false,
  target_segment_curl text,
  target_segment_porosity text,
  primary_rd_goal text,
  focus_product_id uuid references catalog_products(id),
  email_reports boolean default true,
  survey_completed_at timestamptz,
  updated_at timestamptz default now(),
  created_at timestamptz default now()
);

CREATE TABLE IF NOT EXISTS brand_rd_reports (
  id uuid primary key default gen_random_uuid(),
  brand_account_id uuid references brand_accounts(id),
  product_id uuid references catalog_products(id),
  report_month date not null,
  report_type text not null CHECK (report_type IN (
    'reformulation', 'segment_targeting', 'competitive', 'trend_signals')),
  title text not null,
  summary text,
  content jsonb not null,
  status text default 'draft' CHECK (status IN (
    'draft', 'reviewed', 'approved', 'sent')),
  claude_generated_at timestamptz,
  reviewed_at timestamptz,
  approved_at timestamptz,
  sent_at timestamptz,
  admin_notes text,
  was_edited boolean default false,
  created_at timestamptz default now()
);

CREATE INDEX IF NOT EXISTS brand_rd_reports_brand_idx ON brand_rd_reports(brand_account_id);
CREATE INDEX IF NOT EXISTS brand_rd_reports_month_idx ON brand_rd_reports(report_month);
CREATE INDEX IF NOT EXISTS brand_rd_reports_status_idx ON brand_rd_reports(status);

-- Service role only: written by /api/admin routes, read by the dashboard API.
ALTER TABLE brand_report_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE brand_rd_reports ENABLE ROW LEVEL SECURITY;
