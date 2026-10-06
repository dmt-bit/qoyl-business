// Safe to import from client code (no server imports). The admin's Supabase
// login email. Server checks use the verified token; the client check is only
// for UI, and RLS enforces the real read access (see supabase/admin_preview_policies.sql).
export const ADMIN_EMAIL = "hey@qoyl.live";
