-- The /apply?tier=... query param used to be shown on the form and then
-- thrown away. Store it so the approval email can link the right Stripe
-- Payment Link (Early Stage $35 / Growth $260 / Enterprise $760).
-- Run in the Supabase SQL editor. Safe to skip -- /api/apply/brand retries
-- without the column if it doesn't exist yet, and the approval email then
-- offers all three tiers.
alter table brand_applications
  add column if not exists requested_tier text
    check (requested_tier in ('early_stage', 'growth', 'enterprise'));
