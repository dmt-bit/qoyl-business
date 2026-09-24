// Single source of truth for the three B2B account types: prices (keep in
// sync with public/marketing/*.html), and the Stripe Payment Link env var
// each one's approval email points at.
export type AccountType = "brand" | "stylist" | "hair_seller";
export type BrandTier = "early_stage" | "growth" | "enterprise";

export const BRAND_TIERS: Record<BrandTier, { label: string; price: string; envVar: string }> = {
  early_stage: { label: "Early Stage", price: "$35/month", envVar: "STRIPE_LINK_BRAND_EARLY_STAGE" },
  growth: { label: "Growth", price: "$260/month", envVar: "STRIPE_LINK_BRAND_GROWTH" },
  enterprise: { label: "Enterprise", price: "$760/month", envVar: "STRIPE_LINK_BRAND_ENTERPRISE" },
};

export const STYLIST_PLAN = { label: "Stylist listing", price: "$35/month", envVar: "STRIPE_LINK_STYLIST" };
export const HAIR_SELLER_PLAN = { label: "Hair seller listing", price: "$35/month", envVar: "STRIPE_LINK_HAIR_SELLER" };

export function isBrandTier(v: unknown): v is BrandTier {
  return typeof v === "string" && v in BRAND_TIERS;
}

// Stripe Payment Links accept ?prefilled_email= so the applicant doesn't
// retype it. Returns null when the env var isn't configured -- the approval
// email then simply omits the payment block rather than sending a dead link.
export function paymentLink(envVar: string, email: string): string | null {
  const base = process.env[envVar];
  if (!base) return null;
  try {
    const url = new URL(base);
    url.searchParams.set("prefilled_email", email);
    return url.toString();
  } catch {
    return null;
  }
}

export type PaymentOption = { label: string; price: string; url: string };

// Payment Link(s) to put in an approval email. Brands with a recorded tier
// get just that one; brands without (applied before requested_tier existed,
// or via a bare /apply) get all three so they can pick. Plans whose env var
// isn't set are skipped.
export function paymentOptionsFor(
  type: AccountType,
  email: string,
  requestedTier?: string | null
): PaymentOption[] {
  const plans =
    type === "stylist"
      ? [STYLIST_PLAN]
      : type === "hair_seller"
        ? [HAIR_SELLER_PLAN]
        : isBrandTier(requestedTier)
          ? [BRAND_TIERS[requestedTier]]
          : Object.values(BRAND_TIERS);
  const options: PaymentOption[] = [];
  for (const plan of plans) {
    const url = paymentLink(plan.envVar, email);
    if (url) options.push({ label: plan.label, price: plan.price, url });
  }
  return options;
}
