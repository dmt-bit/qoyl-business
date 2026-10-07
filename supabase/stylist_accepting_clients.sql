-- Stylist "accepting new clients" toggle (dashboard Section 1). Defaults to
-- true so every existing stylist stays visible in Style Match results until
-- they explicitly turn it off - this column doesn't exist yet, so nothing
-- currently filters on it.
-- Run in the Supabase SQL editor. Safe to re-run.

ALTER TABLE stylist_accounts
  ADD COLUMN IF NOT EXISTS accepting_new_clients boolean NOT NULL DEFAULT true;
