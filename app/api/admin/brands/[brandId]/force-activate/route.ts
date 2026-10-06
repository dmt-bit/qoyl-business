import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminRequest } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Admin-only: marks a brand active without a payment, for testing the dashboard.
// Never reachable by a brand user -- the caller must hold the admin login token.
export async function POST(request: Request, { params }: { params: { brandId: string } }) {
  if (!(await isAdminRequest(request))) {
    return NextResponse.json({ success: false, message: "Forbidden" }, { status: 403 });
  }

  const { data, error } = await getSupabaseAdmin()
    .from("brand_accounts")
    .update({ status: "active", activated_at: new Date().toISOString() })
    .eq("id", params.brandId)
    .select("id")
    .maybeSingle();

  if (error) {
    console.error("[admin force-activate] update failed:", error.message);
    return NextResponse.json({ success: false, message: "Update failed." }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ success: false, message: "Brand not found." }, { status: 404 });
  }
  console.log("[admin force-activate] brand activated without payment:", params.brandId);
  return NextResponse.json({ success: true });
}
