import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// Records when a paid brand last opened the dashboard (brand_accounts.
// dashboard_last_viewed_at). Authenticated by the caller's Supabase session
// token - the account is looked up from the verified user, never from the
// request body. Best-effort: the layout doesn't wait on or depend on this.
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const token = (request.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!token) return NextResponse.json({ error: "Unauthorized." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: userData, error: userError } = await admin.auth.getUser(token);
  if (userError || !userData.user?.email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const { error } = await admin
    .from("brand_accounts")
    .update({ dashboard_last_viewed_at: new Date().toISOString() })
    .eq("email", userData.user.email)
    .eq("status", "active");
  if (error) console.error("[brand heartbeat] update failed:", error.message);

  return NextResponse.json({ ok: true });
}
