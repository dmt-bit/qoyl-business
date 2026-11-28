// Single source of truth for the B2B account types: prices (keep in sync with
// public/marketing/*.html), and the Stripe Payment Link env var each plan's
// emails point at.
export type AccountType = "brand" | "hair_seller";

// Brands have one plan. The DB keeps the 'early_stage' value (the only one in
// use); it isn't shown anywhere in the UI.
export const BRAND_PLAN = {
  label: "Brand intelligence",
  price: "$50/month",
  cents: 5000,
  dbTier: "early_stage" as const,
  envVar: "STRIPE_LINK_BRAND_EARLY_STAGE",
};

export const HAIR_SELLER_PLAN = { label: "Hair seller listing", price: "$50/month", envVar: "STRIPE_LINK_HAIR_SELLER" };

// Stripe Payment Links accept ?prefilled_email= so the applicant doesn't
// retype it. Returns null when the env var isn't configured.
// client_reference_id ties the payment to a brand_accounts row for the Stripe
// webhook (app/api/webhooks/brand-stripe); Payment Links accept it as a URL param.
export function paymentLink(envVar: string, email: string, clientReferenceId?: string | null): string | null {
  const base = process.env[envVar];
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("prefilled_email", email);
    if (clientReferenceId) url.searchParams.set("client_reference_id", clientReferenceId);
    return url.toString();
  } catch {
    return null;
  }
}

export type PaymentOption = { label: string; price: string; url: string };

// Payment Link for a hair seller approval email. Empty when the env var isn't set.
export function paymentOptionsFor(type: "hair_seller", email: string): PaymentOption[] {
  const url = paymentLink(HAIR_SELLER_PLAN.envVar, email);
  return url ? [{ label: HAIR_SELLER_PLAN.label, price: HAIR_SELLER_PLAN.price, url }] : [];
}

// The brand's own Payment Link, with client_reference_id = brand_accounts.id.
export function brandPaymentUrl(email: string, brandAccountId: string): string | null {
  return paymentLink(BRAND_PLAN.envVar, email, brandAccountId);
}
