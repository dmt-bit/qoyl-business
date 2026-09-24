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

export const PRICING_TIERS: PricingTier[] = [
  {
    name: "Early Stage",
    price: "$35",
    audience: "For indie brands with 1-5 products",
    includes: [
      "Ingredient performance scores for up to 3 products",
      "Monthly insight report",
      "Consumer demand signals access",
      "Email support",
    ],
    bestFor:
      "Small Black-owned and indie hair care brands scaling their first product line",
    cta: "Apply for Early Stage →",
    ctaHref: "/apply?tier=early_stage",
  },
  {
    name: "Growth",
    price: "$260",
    audience: "For established brands with 6-20 products",
    includes: [
      "Everything in Early Stage",
      "Scores for up to 10 products",
      "Reformulation signals",
      "Bi-weekly insight reports",
      "Priority support",
    ],
    bestFor:
      "Brands actively developing new SKUs or reformulating existing products",
    cta: "Apply for Growth →",
    ctaHref: "/apply?tier=growth",
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "$760",
    audience: "For large catalogs and custom needs",
    includes: [
      "Everything in Growth",
      "Unlimited products",
      "Custom integration",
      "Weekly insight calls",
      "Dedicated account support",
      "API access",
    ],
    bestFor: "Larger brands or investors who want deep ongoing intelligence",
    cta: "Contact us →",
    ctaHref: "mailto:hello@qoyl.live",
  },
];
