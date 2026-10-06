import { NextResponse } from "next/server";
import { NOTIFY_EMAIL, sendEmail } from "@/lib/email";
import { applicationAlertEmail } from "@/lib/emailTemplates";
import { BRAND_TIERS, isBrandTier, type BrandTier } from "@/lib/accountTypes";
import { PaymentNotConfiguredError, startBrandSignup } from "@/lib/brandSignup";
import { str, validEmail } from "@/lib/applications";

export const dynamic = "force-dynamic";

// Self-serve brand signup. There's no approval queue: a valid application
// creates the account (pending_payment) and emails the applicant a payment
// link. hey@qoyl.live gets an alert for every submission.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const companyName = str(body, "company_name", 200);
  const contactName = str(body, "contact_name", 200);
  const email = str(body, "email", 254).toLowerCase();
  if (!companyName || !contactName || !validEmail(email)) {
    return NextResponse.json(
      { success: false, message: "Company name, contact name and a valid email are required." },
      { status: 400 }
    );
  }
  if (!isBrandTier(body.requested_tier)) {
    return NextResponse.json({ success: false, message: "Choose a plan to continue." }, { status: 400 });
  }
  const tier: BrandTier = body.requested_tier;

  const website = str(body, "website", 300) || null;
  const instagram = str(body, "instagram_handle", 100) || null;
  const catalogSize = str(body, "product_count", 20) || null;
  const revenue = str(body, "annual_revenue", 50) || null;
  const about = str(body, "why_qoyl", 3000) || null;
  const productToScore = str(body, "product_to_score", 200) || null;

  let result;
  try {
    result = await startBrandSignup({
      companyName,
      contactName,
      email,
      website,
      instagram,
      catalogSize,
      about,
      productToScore,
      tier,
    });
  } catch (err) {
    if (err instanceof PaymentNotConfiguredError) {
      console.error("[apply/brand] payment link missing:", err.message);
      return NextResponse.json(
        {
          success: false,
          message: "Payment isn't set up for this plan yet. Email hey@qoyl.live and we'll get you started.",
        },
        { status: 503 }
      );
    }
    console.error("[apply/brand] signup failed:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong submitting your application. Please try again." },
      { status: 500 }
    );
  }

  const plan = BRAND_TIERS[tier];
  const notes = [
    result.alreadyActive
      ? "email already has an active account - sent a sign-in link instead"
      : "auto-approved — payment link sent directly",
    result.emailSent ? null : "applicant's payment email FAILED to send - check Resend",
  ]
    .filter(Boolean)
    .join(" · ");

  const alert = applicationAlertEmail({
    type: "brand",
    name: companyName,
    note: notes,
    fields: [
      ["COMPANY", companyName],
      ["CONTACT", contactName],
      ["EMAIL", email],
      ["PLAN", `${plan.label} (${plan.price})`],
      ["WEBSITE", website ?? ""],
      ["INSTAGRAM", instagram ?? ""],
      ["PRODUCTS", catalogSize ?? ""],
      ["REVENUE", revenue ?? ""],
      ["PRODUCT TO SCORE", productToScore ?? ""],
      ["WHY QOYL", about ?? ""],
    ],
  });
  const alertResult = await sendEmail({ to: NOTIFY_EMAIL, replyTo: email, ...alert });
  if (!alertResult.sent) console.error("[apply/brand] alert email failed:", alertResult.error);

  return NextResponse.json({ success: true, message: "Application received" });
}
