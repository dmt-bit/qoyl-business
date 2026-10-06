export type PricingTier = {
  name: string;
  price: string;
  audience: string;
  includes: string[];
  bestFor: string;
  cta: string;
  ctaHref: string;
  highlight?: boolean;
};

// Brands have one plan: $50/month with everything included.
export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Brand intelligence",
    price: "$50",
    audience: "For any brand selling hair products",
    includes: [
      "Full product score matrix across 6 hair profiles",
      "Segment breakdown by curl type and porosity",
      "Ingredient flag analysis",
      "Reformulation signals",
      "Geographic demand data",
      "Style match placement tracking",
      "Unlimited products",
    ],
    bestFor: "Brands that want to know how their formulas perform across real hair types",
    cta: "Apply for brand access →",
    ctaHref: "/apply",
  },
];
