import Link from "next/link";

type Tier = {
  name: string;
  price: string;
  audience: string;
  includes: string[];
  bestFor: string;
  cta: string;
  ctaHref: string;
  highlight?: boolean;
};

const TIERS: Tier[] = [
  {
    name: "Early Stage",
    price: "$250",
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
    price: "$750",
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
    price: "$2,500",
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

export default function PricingPage() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <Link href="/" className="font-serif text-xl tracking-wide text-cream">
          QOYL <span className="text-bronze2">BUSINESS</span>
        </Link>
        <nav className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="text-sm text-cream transition-colors hover:text-bronze2"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-cream"
          >
            Brand login
          </Link>
        </nav>
      </header>

      <main className="flex-1 px-6 py-16 sm:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <p className="text-xs uppercase tracking-[0.3em] text-bronze2 mb-6">
            Pricing
          </p>
          <h1 className="font-serif text-4xl sm:text-5xl leading-tight text-cream">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-lg text-sand leading-relaxed">
            Choose the tier that matches where your brand is today.
          </p>
        </div>

        <div className="mx-auto mt-16 grid max-w-5xl gap-6 sm:grid-cols-3">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`relative flex flex-col rounded-lg border bg-warm/[0.03] p-8 ${
                tier.highlight ? "border-bronze" : "border-warm/10"
              }`}
            >
              {tier.highlight && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-bronze px-4 py-1 text-xs font-medium uppercase tracking-wider text-dark">
                  Most popular
                </span>
              )}

              <h2 className="font-serif text-2xl text-bronze2">{tier.name}</h2>
              <p className="mt-2 font-serif text-4xl text-cream">
                {tier.price}
                <span className="text-base text-muted">/month</span>
              </p>
              <p className="mt-3 text-sm text-muted">{tier.audience}</p>

              <ul className="mt-6 flex-1 space-y-3 border-t border-warm/10 pt-6">
                {tier.includes.map((item) => (
                  <li key={item} className="flex gap-2 text-sm text-sand">
                    <span className="text-bronze2" aria-hidden>
                      ✓
                    </span>
                    {item}
                  </li>
                ))}
              </ul>

              <p className="mt-6 text-xs leading-relaxed text-muted">
                <span className="text-sand">Best for: </span>
                {tier.bestFor}
              </p>

              <Link
                href={tier.ctaHref}
                className={`mt-8 inline-flex items-center justify-center gap-2 rounded-full px-6 py-3 text-sm font-medium uppercase tracking-wider transition-colors ${
                  tier.highlight
                    ? "bg-bronze text-dark hover:bg-bronze2"
                    : "border border-bronze/40 text-bronze2 hover:bg-bronze/10"
                }`}
              >
                {tier.cta}
              </Link>
            </div>
          ))}
        </div>
      </main>

      <footer className="px-6 pb-8 text-center text-xs text-muted sm:px-12">
        © {new Date().getFullYear()} Qoyl. Brand intelligence for the next
        generation of hair care, across every texture.
      </footer>
    </div>
  );
}
