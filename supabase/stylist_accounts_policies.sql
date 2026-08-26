-- stylist_accounts already exists in this shared Supabase project (see
-- qoyl-beta's supabase/create_style_match.sql) but has no RLS policies of
-- its own yet. Adding the same "read own row by email" policy
-- brand_accounts already uses, so the stylist dashboard can resolve the
-- logged-in stylist's own account client-side.
create policy "Stylist can read own account by email"
  on stylist_accounts for select
  to authenticated
  using ((auth.jwt() ->> 'email') = email);
