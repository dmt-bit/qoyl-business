import { randomUUID } from "crypto";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { sendEmail } from "./email";
import { BRAND_PLAN, brandPaymentUrl } from "./accountTypes";
import { brandWelcomeWithPaymentEmail, signInLinkEmail } from "./emailTemplates";
import { findCatalogBrandId } from "./catalogBrandMatch";

// Self-serve brand signup: no approval step. Applying creates the login and a
// pending_payment account, and emails the applicant their Payment Link. The
// Stripe webhook (app/api/webhooks/brand-stripe) flips the account to active.

export class PaymentNotConfiguredError extends Error {}

export type BrandAccountRow = {
  id: string;
  email: string;
  company_name: string;
  contact_name: string;
  status: string;
  payment_url: string | null;
  product_to_score: string | null;
};

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://business.qoyl.live").replace(/\/$/, "");
}

export function firstNameOf(contactName: string): string {
  return contactName.trim().split(/\s+/)[0] || "there";
}

// One-time sign-in link. generateLink doesn't send mail, so we send it ourselves
// through Resend (see the callers).
export async function generateSignInLink(email: string, path: string): Promise<string> {
  const { data, error } = await getSupabaseAdmin().auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: `${siteUrl()}${path}` },
  });
  const link = data?.properties?.action_link;
  if (error || !link) throw new Error(`generateLink failed: ${error?.message ?? "no action_link"}`);
  return link;
}

// Creates the login with no password (they sign in by magic link). Returns the
// auth user id, or null when the email already has one from another account type.
async function createAuthUser(email: string, companyName: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin().auth.admin.createUser({
    email,
    email_confirm: true,
    user_metadata: { brand_name: companyName, account_type: "brand" },
  });
  if (data?.user) return data.user.id;
  if (error && /already|registered|exists/i.test(error.message)) return null;
  throw new Error(`createUser failed: ${error?.message ?? "unknown"}`);
}

// Sends (or re-sends) the payment email for a pending brand account. Returns
// false when the email couldn't be sent; never throws for a send failure.
export async function sendBrandPaymentEmail(account: BrandAccountRow): Promise<boolean> {
  const paymentUrl = account.payment_url ?? brandPaymentUrl(account.email, account.id);
  if (!paymentUrl) return false;
  const result = await sendEmail({
    to: account.email,
    ...brandWelcomeWithPaymentEmail({
      firstName: firstNameOf(account.contact_name),
      brandName: account.company_name,
      productToScore: account.product_to_score,
      paymentUrl,
    }),
  });
  if (!result.sent) console.error("[brand-signup] payment email failed:", account.email, result.error);
  return result.sent;
}

export type BrandSignupInput = {
  companyName: string;
  contactName: string;
  email: string;
  website: string | null;
  instagram: string | null;
  about: string | null;
  productToScore: string | null;
  source: string | null;
};

export type BrandSignupResult = {
  accountId: string;
  alreadyActive: boolean;
  emailSent: boolean;
};

export async function startBrandSignup(input: BrandSignupInput): Promise<BrandSignupResult> {
  const admin = getSupabaseAdmin();

  const { data: existing, error: lookupError } = await admin
    .from("brand_accounts")
    .select("*")
    .eq("email", input.email)
    .maybeSingle();
  if (lookupError) throw new Error(`brand_accounts lookup failed: ${lookupError.message}`);

  // Already paid: don't touch the account, just send a sign-in link.
  if (existing?.status === "active") {
    const link = await generateSignInLink(input.email, "/dashboard");
    const mail = await sendEmail({
      to: input.email,
      ...signInLinkEmail({ firstName: firstNameOf(input.contactName), magicLinkUrl: link }),
    });
    return { accountId: existing.id, alreadyActive: true, emailSent: mail.sent };
  }

  // Id is fixed before insert so the Payment Link can carry it as client_reference_id.
  const accountId: string = existing?.id ?? randomUUID();
  const paymentUrl = brandPaymentUrl(input.email, accountId);
  if (!paymentUrl) {
    throw new PaymentNotConfiguredError("STRIPE_LINK_BRAND_EARLY_STAGE is not set or invalid");
  }

  const accountFields = {
    company_name: input.companyName,
    contact_name: input.contactName,
    website: input.website,
    instagram_handle: input.instagram,
    tier: BRAND_PLAN.dbTier,
    plan_tier: BRAND_PLAN.dbTier,
    plan_price_cents: BRAND_PLAN.cents,
    status: "pending_payment",
    payment_url: paymentUrl,
    product_to_score: input.productToScore,
    about: input.about,
  };

  if (existing) {
    const { error } = await admin.from("brand_accounts").update(accountFields).eq("id", existing.id);
    if (error) throw new Error(`brand_accounts update failed: ${error.message}`);
  } else {
    const userId = await createAuthUser(input.email, input.companyName);
    const { error } = await admin
      .from("brand_accounts")
      .insert({ id: accountId, email: input.email, user_id: userId, ...accountFields });
    if (error) throw new Error(`brand_accounts insert failed: ${error.message}`);
  }

  // Link to the catalog brand when the name matches exactly one. Non-fatal:
  // an unmatched brand is linked by an admin later.
  try {
    const catalogBrandId = await findCatalogBrandId(input.companyName);
    if (catalogBrandId) {
      const { error: linkError } = await admin.from("brand_accounts").update({ brand_id: catalogBrandId }).eq("id", accountId);
      if (linkError) console.error("[brand-signup] catalog link failed:", linkError.message);
    }
  } catch (err) {
    console.error("[brand-signup] catalog match failed:", err instanceof Error ? err.message : err);
  }

  // Kept for records only -- the account above is what gates access.
  const { error: applicationError } = await admin.from("brand_applications").insert({
    company_name: input.companyName,
    contact_name: input.contactName,
    email: input.email,
    website: input.website,
    instagram_handle: input.instagram,
    why_qoyl: input.about,
    product_to_score: input.productToScore,
    source: input.source,
    requested_tier: BRAND_PLAN.dbTier,
    status: "auto_approved",
  });
  if (applicationError) console.error("[brand-signup] brand_applications insert failed:", applicationError.message);

  const emailSent = await sendBrandPaymentEmail({
    id: accountId,
    email: input.email,
    company_name: input.companyName,
    contact_name: input.contactName,
    status: "pending_payment",
    payment_url: paymentUrl,
    product_to_score: input.productToScore,
  });

  return { accountId, alreadyActive: false, emailSent };
}
