import { NextResponse } from "next/server";
import { NOTIFY_EMAIL, sendEmail } from "@/lib/email";
import { applicationAlertEmail } from "@/lib/emailTemplates";
import { BRAND_PLAN } from "@/lib/accountTypes";
import { PaymentNotConfiguredError, startBrandSignup } from "@/lib/brandSignup";
import { str, validEmail } from "@/lib/applications";

export const dynamic = "force-dynamic";

const SOURCE_OPTIONS = new Set(["instagram", "tiktok", "friend_or_referral", "search", "other"]);

// Self-serve brand signup. One plan ($50/month), so no tier in the request.
// A valid application creates the account (pending_payment) and emails the
// applicant the payment link. hey@qoyl.live gets an alert for every submission.
export async function POST(request: Request) {
  // TEMP (remove after confirming the Vercel deploy picked up the env var):
  // reads the link on every request and logs only its first 30 characters.
  console.log("stripe url:", (process.env.STRIPE_LINK_BRAND_EARLY_STAGE?.slice(0, 30) ?? "NOT SET") + "...");

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const companyName = str(body, "company_name", 200);
  const contactName = str(body, "contact_name", 200);
  const email = str(body, "email", 254).toLowerCase();
  const website = str(body, "website", 300) || null;
  const instagram = str(body, "instagram_handle", 100) || null;
  if (!companyName || !contactName || !validEmail(email)) {
    return NextResponse.json(
      { success: false, message: "Brand name, your name and a valid email are required." },
      { status: 400 }
    );
  }
  if (!website && !instagram) {
    return NextResponse.json(
      { success: false, message: "Add a website or an instagram handle." },
      { status: 400 }
    );
  }

  const stripeUrl = process.env.STRIPE_LINK_BRAND_EARLY_STAGE;
  if (!stripeUrl) {
    console.error("STRIPE_LINK_BRAND_EARLY_STAGE is not set");
    return NextResponse.json(
      { success: false, message: "Payment configuration error. Contact hey@qoyl.live." },
      { status: 500 }
    );
  }

  const about = str(body, "why_qoyl", 3000) || null;
  const productToScore = str(body, "product_to_score", 200) || null;
  const sourceRaw = str(body, "source", 50);
  const source = SOURCE_OPTIONS.has(sourceRaw) ? sourceRaw : null;

  let result;
  try {
    result = await startBrandSignup({
      companyName,
      contactName,
      email,
      website,
      instagram,
      about,
      productToScore,
      source,
    });
  } catch (err) {
    if (err instanceof PaymentNotConfiguredError) {
      console.error("[apply/brand] payment link missing:", err.message);
      return NextResponse.json(
        { success: false, message: "Payment configuration error. Contact hey@qoyl.live." },
        { status: 500 }
      );
    }
    console.error("[apply/brand] signup failed:", err);
    return NextResponse.json(
      { success: false, message: "Something went wrong submitting your application. Please try again." },
      { status: 500 }
    );
  }

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
      ["BRAND", companyName],
      ["CONTACT", contactName],
      ["EMAIL", email],
      ["PLAN", BRAND_PLAN.price],
      ["WEBSITE", website ?? ""],
      ["INSTAGRAM", instagram ?? ""],
      ["PRODUCT TO SCORE", productToScore ?? ""],
      ["HEARD ABOUT QOYL VIA", source ?? ""],
      ["ABOUT", about ?? ""],
    ],
  });
  const alertResult = await sendEmail({ to: NOTIFY_EMAIL, replyTo: email, ...alert });
  if (!alertResult.sent) console.error("[apply/brand] alert email failed:", alertResult.error);

  return NextResponse.json({ success: true, message: "Application received" });
}
