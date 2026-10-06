import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { signInLinkEmail } from "@/lib/emailTemplates";
import { firstNameOf, generateSignInLink, sendBrandPaymentEmail, type BrandAccountRow } from "@/lib/brandSignup";
import { validEmail } from "@/lib/applications";

export const dynamic = "force-dynamic";

// The response is identical whether or not an account exists, so this can't be
// used to find out who has an account. What gets sent depends on the account:
//   active brand           -> sign-in link to the brand dashboard
//   pending_payment brand  -> the payment email again (no link in the response)
//   stylist / hair seller  -> sign-in link to their dashboard
const ACK = {
  success: true,
  message: "If an account exists for that email, we've sent a link to it. Check your inbox and spam folder.",
};

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";
  if (!validEmail(email)) {
    return NextResponse.json({ success: false, message: "Enter a valid email." }, { status: 400 });
  }

  try {
    await sendLinkIfAccount(email);
  } catch (err) {
    console.error("[magic-link] failed:", err instanceof Error ? err.message : err);
  }
  return NextResponse.json(ACK);
}

async function sendSignInLink(email: string, contactName: string, path: string) {
  const link = await generateSignInLink(email, path);
  const result = await sendEmail({
    to: email,
    ...signInLinkEmail({ firstName: firstNameOf(contactName), magicLinkUrl: link }),
  });
  if (!result.sent) console.error("[magic-link] email failed:", result.error);
}

async function sendLinkIfAccount(email: string) {
  const admin = getSupabaseAdmin();

  const { data: brand } = await admin.from("brand_accounts").select("*").eq("email", email).maybeSingle();
  if (brand) {
    const row = brand as BrandAccountRow;
    if (row.status === "active") await sendSignInLink(email, row.contact_name, "/dashboard");
    else if (row.status === "pending_payment") await sendBrandPaymentEmail(row);
    return;
  }

  const { data: stylist } = await admin
    .from("stylist_accounts")
    .select("contact_name")
    .eq("email", email)
    .maybeSingle();
  if (stylist) {
    await sendSignInLink(email, stylist.contact_name, "/stylist/dashboard");
    return;
  }

  const { data: sellerAccount } = await admin
    .from("fake_hair_brand_accounts")
    .select("contact_name")
    .eq("email", email)
    .maybeSingle();
  if (sellerAccount) {
    await sendSignInLink(email, sellerAccount.contact_name, "/fake-hair-brand/dashboard");
  }
}
