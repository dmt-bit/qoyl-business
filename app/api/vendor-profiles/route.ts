import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { str, validEmail } from "@/lib/applications";

export const dynamic = "force-dynamic";

const PLAN_TYPES = new Set(["stylist", "hair-seller", "brand"]);
// Explicit recipient for new vendor signups, per the task that added this
// route -- intentionally not lib/email.ts's NOTIFY_EMAIL (hey@qoyl.live).
const SIGNUP_NOTIFY_EMAIL = "dailydiortwine@gmail.com";

// Best-effort: resolves the Stripe customer id from the checkout session, so
// /welcome doesn't have to wait on it. Needs STRIPE_SECRET_KEY (not set in
// this repo yet) and a session_id -- returns null and logs rather than
// failing the signup when either is missing or the lookup errors.
async function resolveStripeCustomerId(sessionId: string | null): Promise<string | null> {
  if (!sessionId) return null;
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    console.error("[vendor-profiles] STRIPE_SECRET_KEY not set; stripe_customer_id will be null");
    return null;
  }
  try {
    const stripe = new Stripe(secretKey);
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const customer = session.customer;
    return typeof customer === "string" ? customer : customer?.id ?? null;
  } catch (err) {
    console.error("[vendor-profiles] Stripe session lookup failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const planType = str(body, "plan_type", 20);
  const userEmail = str(body, "user_email", 254).toLowerCase();
  const businessName = str(body, "business_name", 200);
  const location = str(body, "location", 200);
  const sessionId = str(body, "session_id", 200) || null;
  const profileData =
    body.profile_data && typeof body.profile_data === "object" ? (body.profile_data as Record<string, unknown>) : {};

  if (!PLAN_TYPES.has(planType) || !validEmail(userEmail) || !businessName || !location) {
    return NextResponse.json(
      { success: false, message: "Plan, email, business name, and location are required." },
      { status: 400 }
    );
  }

  const stripeCustomerId = await resolveStripeCustomerId(sessionId);

  const { data: row, error } = await getSupabaseAdmin()
    .from("vendor_profiles")
    .insert({
      user_email: userEmail,
      plan_type: planType,
      business_name: businessName,
      location,
      profile_data: profileData,
      stripe_customer_id: stripeCustomerId,
      status: "pending_review",
    })
    .select("id")
    .single();

  if (error || !row) {
    console.error("[vendor-profiles] insert failed:", error?.message);
    return NextResponse.json({ success: false, message: "Could not save your profile. Please try again." }, { status: 500 });
  }

  const contactName = typeof profileData.contact_name === "string" ? profileData.contact_name : "";
  const detailLines = Object.entries(profileData)
    .filter(([key, value]) => key !== "contact_name" && value)
    .map(([key, value]) => `${key.replace(/_/g, " ")}: ${value}`)
    .join("\n");

  const notify = await sendEmail({
    to: SIGNUP_NOTIFY_EMAIL,
    replyTo: userEmail,
    subject: `new vendor signup — ${planType} — ${businessName}`,
    text: `${businessName} just joined qoyl as a ${planType}.\n\ncontact: ${contactName || "—"} <${userEmail}>\nlocation: ${location}\nstripe customer: ${stripeCustomerId ?? "not resolved — see server logs"}\n\n${detailLines}\n\nReview in Supabase: vendor_profiles, id ${row.id}.`,
  });
  if (!notify.sent) console.error("[vendor-profiles] notification email failed:", notify.error);

  return NextResponse.json({ success: true });
}
