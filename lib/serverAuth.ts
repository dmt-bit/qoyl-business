import { getSupabaseAdmin } from "./supabaseAdmin";

// Verifies a Supabase access token server-side and returns the caller's
// email, or null if it's missing/invalid. Used by server actions that
// need to know who's really calling before touching cross-app tables
// (style_matches, hair_profiles) that contain other people's data --
// trusting a client-supplied id alone would let one stylist/brand pass
// another's id and read data that isn't theirs.
export async function verifyCallerEmail(accessToken: string | null | undefined): Promise<string | null> {
  if (!accessToken) return null;
  const { data, error } = await getSupabaseAdmin().auth.getUser(accessToken);
  if (error || !data.user?.email) return null;
  return data.user.email;
}
