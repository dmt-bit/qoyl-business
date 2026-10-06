import { getSupabaseAdmin } from "./supabaseAdmin";
import { ADMIN_EMAIL } from "./adminConfig";

export type BrandApiAccount = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  status: string;
  brand_id: string | null;
};

type AccessResult =
  | { ok: true; account: BrandApiAccount; isAdmin: boolean }
  | { ok: false; status: number; message: string };

// Resolves the brand account a request is about, from a verified Supabase token.
// A brand session always gets its own account and ignores brandId. The admin
// login may pass brandId to view any brand. Only active accounts pass.
export async function resolveBrandAccess(request: Request, brandId: string | null): Promise<AccessResult> {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return { ok: false, status: 401, message: "Sign in required." };

  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  const email = userData?.user?.email?.toLowerCase();
  if (userError || !email) return { ok: false, status: 401, message: "Sign in required." };

  const columns = "id, company_name, contact_name, email, status, brand_id";
  if (email === ADMIN_EMAIL) {
    if (!brandId) return { ok: false, status: 400, message: "brandId is required for the admin view." };
    const { data } = await admin.from("brand_accounts").select(columns).eq("id", brandId).maybeSingle();
    if (!data) return { ok: false, status: 404, message: "Brand not found." };
    return { ok: true, account: data as BrandApiAccount, isAdmin: true };
  }

  const { data } = await admin.from("brand_accounts").select(columns).eq("email", email).maybeSingle();
  if (!data) return { ok: false, status: 404, message: "No brand account for this login." };
  if (data.status !== "active") return { ok: false, status: 403, message: "Dashboard is available after payment." };
  return { ok: true, account: data as BrandApiAccount, isAdmin: false };
}
