const MONO = "font-[family-name:var(--font-mono-apply)]";

type Plan = {
  key: "stylist" | "hair-seller" | "brand";
  label: string;
  price: string;
  body: string;
  cta: string;
  href: string;
  featured?: boolean;
};

// Stylist is the featured (black) card -- the most accessible entry point
// for a salon owner, the one pitched most in person.
const PLANS: Plan[] = [
  {
    key: "stylist",
    label: "stylist",
    price: "$35/mo",
    body: "clients arrive prepared. style chosen. install type selected. products already matched.",
    cta: "join as a stylist →",
    href: "https://buy.stripe.com/7sY6oI1ad3gPceQ0rO3ks0c",
    featured: true,
  },
  {
    key: "hair-seller",
    label: "hair seller",
    price: "$50/mo",
    body: "your bundles surface in style matches for buyers whose texture and color goals match your inventory.",
    cta: "join as a hair seller →",
    href: "https://buy.stripe.com/cNi7sM0697x50w87Ug3ks0d",
  },
  {
    key: "brand",
    label: "brand",
    price: "$50/mo",
    body: "geographic scan data. stylist match rates. neighborhood-level product performance.",
    cta: "join as a brand →",
    href: "https://buy.stripe.com/fZu3cw4mp6t16Uw1vS3ks0e",
  },
];

const STATS: { n: string; label: string }[] = [
  { n: "60+", label: "clients on the waitlist" },
  { n: "type 3 & 4", label: "majority hair types actively matching" },
  { n: "chicago → nyc", label: "markets live now" },
];

const STEPS = [
  "complete your profile + inventory",
  "get matched to buyers by hair type, texture + color goal",
  "they arrive ready. you deliver.",
];

export default function JoinPage() {
  const phone = process.env.NEXT_PUBLIC_CONTACT_PHONE;

  return (
    <main className="mx-auto max-w-5xl px-6 py-14 sm:px-10 sm:py-20">
      {/* HERO */}
      <section className="text-center">
        <h1 className="text-4xl font-bold lowercase leading-[1.05] tracking-[-1.5px] sm:text-6xl">
          your shop. every style match.
        </h1>
        <p className={`${MONO} mx-auto mt-5 max-w-md text-xs leading-relaxed text-[#666] sm:text-sm`}>
          qoyl connects your inventory to buyers who already know what they want.
        </p>
      </section>

      {/* PLAN CARDS */}
      <section className="mt-14 grid gap-5 sm:mt-16 sm:grid-cols-3">
        {PLANS.map((plan) => (
          <div
            key={plan.key}
            className={`flex flex-col border-2 border-[#0a0a0a] p-6 ${
              plan.featured ? "bg-[#0a0a0a] text-white" : "bg-white text-[#0a0a0a]"
            }`}
          >
            <p className={`${MONO} text-[10px] uppercase tracking-[0.18em] ${plan.featured ? "text-white/60" : "text-[#888]"}`}>
              {plan.label}
            </p>
            <p className={`${MONO} mt-2 text-[32px] font-bold leading-none`}>{plan.price}</p>
            <p className={`${MONO} mt-1 text-[10px] lowercase tracking-[0.04em] ${plan.featured ? "text-[#b5814a]" : "text-[#b5814a]"}`}>
              first month free · cancel anytime
            </p>
            <p className={`mt-5 flex-1 text-sm font-light leading-relaxed lowercase ${plan.featured ? "text-white/80" : "text-[#444]"}`}>
              {plan.body}
            </p>
            <a
              href={plan.href}
              className={`mt-6 block w-full py-3.5 text-center text-sm font-semibold lowercase transition-opacity hover:opacity-80 ${
                plan.featured ? "bg-white text-[#0a0a0a]" : "bg-[#0a0a0a] text-white"
              }`}
            >
              {plan.cta}
            </a>
          </div>
        ))}
      </section>

      {/* SOCIAL PROOF BAND */}
      <section className="-mx-6 mt-16 grid grid-cols-1 gap-8 bg-[#0a0a0a] px-6 py-10 text-center text-white sm:-mx-10 sm:mt-20 sm:grid-cols-3 sm:px-10">
        {STATS.map((stat) => (
          <div key={stat.label}>
            <p className="text-2xl font-bold lowercase sm:text-3xl">{stat.n}</p>
            <p className={`${MONO} mt-2 text-[10px] lowercase tracking-[0.04em] text-white/60`}>{stat.label}</p>
          </div>
        ))}
      </section>

      {/* HOW IT WORKS */}
      <section className="mt-16 sm:mt-20">
        <p className={`${MONO} text-center text-[10px] uppercase tracking-[0.18em] text-[#888]`}>how it works</p>
        <div className="mt-8 grid gap-8 sm:grid-cols-3">
          {STEPS.map((step, i) => (
            <div key={step} className="text-center">
              <p className={`${MONO} text-2xl font-bold text-[#b5814a]`}>{String(i + 1).padStart(2, "0")}</p>
              <p className="mt-3 text-sm font-light lowercase leading-relaxed text-[#444]">{step}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER CTA */}
      <section className="mt-16 border-t border-[#e8e8e8] pt-8 text-center sm:mt-20">
        {phone ? (
          <a href={`sms:${phone}`} className="text-sm font-medium lowercase text-[#0a0a0a] underline underline-offset-4">
            questions? text us
          </a>
        ) : (
          <a href="mailto:hey@qoyl.live" className="text-sm font-medium lowercase text-[#0a0a0a] underline underline-offset-4">
            questions? email us
          </a>
        )}
      </section>
    </main>
  );
}
