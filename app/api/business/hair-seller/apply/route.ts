import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { PRODUCT_TYPES, SELLER_TIERS, isStringArray } from "@/lib/hairSeller";

const NOTIFY_EMAIL = "hey@qoyl.live";

export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const { brand_name, contact_name, email, website, product_types, styles_served, tier } = body;

  if (
    typeof brand_name !== "string" || !brand_name.trim() ||
    typeof contact_name !== "string" || !contact_name.trim() ||
    typeof email !== "string" || !/^\S+@\S+\.\S+$/.test(email)
  ) {
    return NextResponse.json(
      { success: false, message: "brand_name, contact_name and a valid email are required." },
      { status: 400 }
    );
  }
  if (!isStringArray(product_types) || product_types.some((t) => !(PRODUCT_TYPES as readonly string[]).includes(t))) {
    return NextResponse.json(
      { success: false, message: `product_types must be a subset of: ${PRODUCT_TYPES.join(", ")}.` },
      { status: 400 }
    );
  }
  if (!isStringArray(styles_served)) {
    return NextResponse.json({ success: false, message: "styles_served must be an array of strings." }, { status: 400 });
  }
  if (typeof tier !== "string" || !(SELLER_TIERS as readonly string[]).includes(tier)) {
    return NextResponse.json({ success: false, message: "tier must be 'standard' or 'featured'." }, { status: 400 });
  }

  // Goes into the applications table (status 'pending'); admin approval
  // promotes it to fake_hair_brand_accounts and creates the login -- the same
  // two-step flow every other account type here uses.
  const { error } = await getSupabaseAdmin().from("fake_hair_brand_applications").insert({
    company_name: brand_name.trim(),
    contact_name: contact_name.trim(),
    email: email.trim().toLowerCase(),
    website: typeof website === "string" && website.trim() ? website.trim() : null,
    product_types,
    styles_served,
    tier,
    status: "pending",
  });

  if (error) {
    console.error("[hair-seller/apply] insert failed:", error);
    return NextResponse.json({ success: false, message: "Could not save your application." }, { status: 500 });
  }

  const summary = `Brand: ${brand_name}
Contact: ${contact_name} <${email}>
Website: ${website || "—"}
Tier requested: ${tier}
Product types: ${product_types.join(", ") || "—"}
Styles served: ${styles_served.join(", ") || "—"}`;

  const [internal, applicant] = await Promise.all([
    sendEmail({
      to: NOTIFY_EMAIL,
      subject: `New hair seller application — ${brand_name}`,
      text: `A new hair seller application was submitted.\n\n${summary}\n\nReview it in /admin under Hair Sellers.`,
    }),
    sendEmail({
      to: email,
      subject: "We received your Qoyl hair seller application",
      text: `Hi ${contact_name},\n\nThanks for applying to sell on Qoyl — we review every application personally and will be in touch within 48 hours.\n\nWhat you submitted:\n${summary}\n\nQuestions? Reply to this email.\n\nD\nFounder, Qoyl`,
    }),
  ]);
  if (!internal.sent) console.error("[hair-seller/apply] internal email failed:", internal.error);
  if (!applicant.sent) console.error("[hair-seller/apply] applicant email failed:", applicant.error);

  return NextResponse.json({ success: true, message: "Application received" });
}
