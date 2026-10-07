import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCallerEmail } from "@/lib/serverAuth";

// Toggles accepting_new_clients on stylist_accounts - the dashboard's most
// important control (see app/stylist/dashboard/page.tsx's Section 1). The
// caller's access token is verified server-side and matched against this
// specific stylist row's email, rather than trusting the [id] param alone -
// same pattern as lib/serverAuth.ts's other callers.
export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const email = await verifyCallerEmail(token);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (typeof body.accepting_new_clients !== "boolean") {
    return NextResponse.json({ error: "accepting_new_clients (boolean) is required." }, { status: 400 });
  }

  const admin = getSupabaseAdmin();
  const { data: stylist, error: lookupError } = await admin
    .from("stylist_accounts")
    .select("id, email")
    .eq("id", params.id)
    .maybeSingle();

  if (lookupError || !stylist || stylist.email !== email) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const { error: updateError } = await admin
    .from("stylist_accounts")
    .update({ accepting_new_clients: body.accepting_new_clients })
    .eq("id", params.id);

  if (updateError) {
    console.error("[stylist/availability] update failed:", updateError.message);
    return NextResponse.json({ error: "Couldn't update availability." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, accepting_new_clients: body.accepting_new_clients });
}
