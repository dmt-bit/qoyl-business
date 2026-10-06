import { getSupabaseAdmin } from "./supabaseAdmin";
import { ADMIN_EMAIL } from "./adminConfig";

// True only when the request carries a valid Supabase access token for the
// admin login. The token is verified server-side with the service role client,
// so it can't be forged from the browser.
export async function isAdminRequest(request: Request): Promise<boolean> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return false;
  const { data, error } = await getSupabaseAdmin().auth.getUser(token);
  if (error || !data.user) return false;
  return data.user.email?.toLowerCase() === ADMIN_EMAIL;
}
