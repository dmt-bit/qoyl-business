import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { NOTIFY_EMAIL, sendEmail } from "@/lib/email";
import { resolveBrandAccess } from "@/lib/brandApiAuth";
import { str } from "@/lib/applications";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const access = await resolveBrandAccess(request, null);
  if (!access.ok) {
    return NextResponse.json({ success: false, message: access.message }, { status: access.status });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }
  const productName = str(body, "product_name", 200);
  if (!productName) {
    return NextResponse.json({ success: false, message: "Enter a product name." }, { status: 400 });
  }

  const { account } = access;
  const { error } = await getSupabaseAdmin()
    .from("brand_product_requests")
    .insert({ brand_account_id: account.id, product_name: productName });
  if (error) {
    console.error("[request-product] insert failed:", error.message);
    return NextResponse.json({ success: false, message: "Could not save your request." }, { status: 500 });
  }

  const sent = await sendEmail({
    to: NOTIFY_EMAIL,
    subject: `product request — ${productName} · ${account.company_name}`,
    text: `${account.company_name} requested analysis for "${productName}".\n\nBrand contact: ${account.contact_name} <${account.email}>\nSubmitted: ${new Date().toISOString()}\n\nAction it in /admin → product requests.`,
  });
  if (!sent.sent) console.error("[request-product] alert email failed:", sent.error);

  return NextResponse.json({ success: true });
}
