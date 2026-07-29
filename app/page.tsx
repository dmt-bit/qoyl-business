import Link from "next/link";
import { PRICING_TIERS } from "@/lib/pricingTiers";

const STATS = [
  "200+ ingredients scored",
  "6 hair profile variables",
  "Every hair texture covered",
];

const MOCK_SCORES: { label: string; score: number; tier: "green" | "amber" | "red" }[] = [
  { label: "Low Porosity", score: 82, tier: "green" },
  { label: "Medium Porosity", score: 58, tier: "amber" },
  { label: "High Porosity", score: 34, tier: "red" },
];

const SCORE_TIER_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
};

const FEATURES = [
  {
    icon: FlaskIcon,
    title: "Ingredient Performance",
    description:
      "See exactly how every ingredient in your formula scores across hair types, porosity levels, scalp conditions, and climate variables. Not category-level data — ingredient-level. Built from the same algorithm powering consumer recommendations.",
    availability: "All tiers",
  },
  {
    icon: TrendIcon,
    title: "Consumer Demand Signals",
    description:
      "Track which ingredients consumers are searching, flagging, and avoiding across all hair textures in real time. Updated as the community uses Qoyl daily — not a quarterly report.",
    availability: "All tiers",
  },
  {
    icon: LightbulbIcon,
    title: "Reformulation Recommendations",
    description:
      "Identify which specific ingredients in your formula are flagged for which consumer segments, and get ingredient-level swap suggestions that would improve compatibility scores for your target audience.",
    availability: "Growth and above",
  },
];

const STEPS = [
  {
    title: "Consumers build profiles",
    description: "Hair type, porosity, scalp condition, climate, water hardness.",
  },
  {
    title: "Products get searched",
    description:
      "Consumers search by brand and product name; ingredient lists are pulled and scored.",
  },
  {
    title: "Outcomes are logged",
    description: "Every search and compatibility score is a real data point.",
  },
  {
    title: "Your dashboard updates",
    description:
      "Brand dashboards reflect aggregate consumer behavior, refreshed continuously.",
  },
];

const TRUST_POINTS = [
  "Built by a systems engineer with pharmaceutical and food manufacturing formulation experience.",
  "No editorial scoring — every score is computed algorithmically from structured ingredient properties.",
  "Brand partners don't get special ratings — paying for a dashboard gives you data, not better scores.",
  "Consumer data is anonymized — dashboards surface aggregate patterns, never personally identifiable data.",
];

export default function Home() {
  return (
    <div className="flex flex-col">
      {/* Section 1 -- Nav */}
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="font-serif text-xl tracking-wide text-cream">
          QOYL <span className="text-bronze2">BUSINESS</span>
        </span>
        <nav className="flex items-center gap-6">
          <Link
            href="/pricing"
            className="hidden text-sm text-muted transition-colors hover:text-cream sm:inline"
          >
            Pricing
          </Link>
          <Link
            href="/login"
            className="hidden text-sm text-muted transition-colors hover:text-cream sm:inline"
          >
            Brand login
          </Link>
          <Link
            href="/apply"
            className="rounded-full bg-bronze px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
          >
            Apply for access →
          </Link>
        </nav>
      </header>

      {/* Section 2 -- Hero */}
      <main className="flex flex-col items-center px-6 pb-24 pt-10 text-center sm:px-12">
        <p className="mb-6 text-xs uppercase tracking-[0.3em] text-bronze2">
          Hair Intelligence Platform
        </p>
        <h1 className="max-w-4xl font-serif text-4xl leading-tight text-cream sm:text-6xl">
          The consumer hair data your R&amp;D team has never had access to.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-relaxed text-sand sm:text-xl">
          Qoyl turns real-world consumer hair data into ingredient intelligence,
          formulation gaps, and trend signals — updated continuously as consumers
          use the platform.
        </p>

        <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row">
          <Link
            href="/apply"
            className="inline-flex items-center gap-2 rounded-full bg-bronze px-8 py-4 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
          >
            Apply for brand access
            <span aria-hidden>→</span>
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-full border border-bronze/40 px-8 py-4 text-sm font-medium uppercase tracking-wider text-bronze2 transition-colors hover:bg-bronze/10"
          >
            See pricing
            <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          {STATS.map((stat) => (
            <span
              key={stat}
              className="rounded-full border border-warm/15 bg-warm/[0.04] px-4 py-2 text-xs text-sand"
            >
              {stat}
            </span>
          ))}
        </div>

        {/* Section 3 -- Dashboard preview */}
        <div className="mx-auto mt-20 w-full max-w-3xl rounded-2xl border border-warm/10 bg-gradient-to-b from-warm/[0.06] to-warm/[0.02] p-8 text-left shadow-2xl shadow-black/40 sm:p-10">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-muted">Sample formula</p>
              <h2 className="mt-1 font-serif text-xl text-cream">Curl Defining Cream</h2>
            </div>
            <span className="flex items-center gap-1.5 rounded-full border border-green/30 bg-green/10 px-3 py-1 text-[10px] uppercase tracking-wider text-green">
              <span className="motion-safe:animate-pulse h-1.5 w-1.5 rounded-full bg-green" />
              Live data
            </span>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            {MOCK_SCORES.map((s) => (
              <div
                key={s.label}
                className="rounded-lg border border-warm/10 bg-warm/[0.03] p-5 text-center"
              >
                <p className="text-[11px] uppercase tracking-wider text-muted">{s.label}</p>
                <p className={`mt-2 font-serif text-4xl ${SCORE_TIER_CLASSES[s.tier]}`}>
                  {s.score}
                </p>
              </div>
            ))}
          </div>

          <div className="mt-6 flex items-start gap-3 rounded-lg border border-bronze/30 bg-bronze/10 p-4">
            <span className="mt-0.5 text-bronze2" aria-hidden>
              ⚠
            </span>
            <div>
              <p className="text-sm font-medium text-bronze2">Formulation gap detected</p>
              <p className="mt-1 text-xs leading-relaxed text-sand">
                High porosity is scoring 34/100 — three ingredients are driving this down.
                Reformulation signals identify the swaps that would close the gap.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Section 4 -- Feature cards */}
      <section className="bg-cream px-6 py-24 text-dark sm:px-12">
        <div className="mx-auto max-w-5xl">
          <div className="grid gap-6 sm:grid-cols-3">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className="flex flex-col rounded-lg border border-dark/8 bg-white p-8 shadow-sm"
              >
                <feature.icon className="h-8 w-8 text-bronze" />
                <h3 className="mt-5 font-serif text-xl text-dark">{feature.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">
                  {feature.description}
                </p>
                <span className="mt-6 inline-block w-fit rounded-full bg-bronze/10 px-3 py-1 text-[11px] uppercase tracking-wider text-bronze">
                  {feature.availability}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 5 -- How it works */}
      <section className="px-6 py-24 sm:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-3xl text-cream sm:text-4xl">
            Your data improves every day the platform grows.
          </h2>

          <div className="relative mt-16 grid gap-10 sm:grid-cols-4">
            <div
              className="absolute left-0 right-0 top-6 hidden h-px bg-warm/10 sm:block"
              aria-hidden
            />
            {STEPS.map((step, i) => (
              <div key={step.title} className="relative flex flex-col items-center">
                <span className="relative z-10 flex h-12 w-12 items-center justify-center rounded-full border border-bronze2/40 bg-dark font-serif text-lg text-bronze2">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <h3 className="mt-4 font-serif text-lg text-cream">{step.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 6 -- Trust signals */}
      <section className="bg-cream px-6 py-24 text-dark sm:px-12">
        <div className="mx-auto max-w-4xl">
          <h2 className="text-center font-serif text-3xl sm:text-4xl">
            Algorithm-first integrity. Always.
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-2">
            {TRUST_POINTS.map((point) => (
              <div key={point} className="flex items-start gap-3 rounded-lg bg-white p-6 shadow-sm">
                <CheckIcon className="mt-0.5 h-5 w-5 shrink-0 text-bronze" />
                <p className="text-sm leading-relaxed text-muted">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 7 -- Pricing preview */}
      <section className="px-6 py-24 sm:px-12">
        <div className="mx-auto max-w-5xl text-center">
          <h2 className="font-serif text-3xl text-cream sm:text-4xl">
            Pricing that scales with your catalog
          </h2>

          <div className="mt-14 grid gap-6 sm:grid-cols-3">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-lg border bg-warm/[0.03] p-8 text-left ${
                  tier.highlight ? "border-bronze" : "border-warm/10"
                }`}
              >
                {tier.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-bronze px-4 py-1 text-xs font-medium uppercase tracking-wider text-dark">
                    Most popular
                  </span>
                )}
                <h3 className="font-serif text-xl text-bronze2">{tier.name}</h3>
                <p className="mt-2 font-serif text-3xl text-cream">
                  {tier.price}
                  <span className="text-sm text-muted">/month</span>
                </p>
                <p className="mt-3 text-xs leading-relaxed text-muted">{tier.audience}</p>
              </div>
            ))}
          </div>

          <Link
            href="/pricing"
            className="mt-10 inline-block text-sm text-bronze2 transition-colors hover:text-bronze"
          >
            See full pricing →
          </Link>
        </div>
      </section>

      {/* Section 8 -- Bottom CTA */}
      <section className="border-t border-warm/10 bg-gradient-to-b from-bronze/[0.08] to-transparent px-6 py-24 text-center sm:px-12">
        <h2 className="font-serif text-3xl text-cream sm:text-4xl">
          Your dashboard is waiting.
        </h2>
        <p className="mt-4 text-sand">
          Apply at business.qoyl.live or get started at the link below.
        </p>

        <Link
          href="/apply"
          className="mt-8 inline-flex items-center gap-2 rounded-full bg-bronze px-10 py-4 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
        >
          Apply for brand access
          <span aria-hidden>→</span>
        </Link>

        <p className="mt-5">
          <Link
            href="/login"
            className="text-sm text-muted transition-colors hover:text-cream"
          >
            Already have an account? Log in →
          </Link>
        </p>

        <p className="mt-8 text-xs text-muted">
          Questions?{" "}
          <a href="mailto:support@qoyl.live" className="text-bronze2 hover:text-bronze">
            support@qoyl.live
          </a>
        </p>
      </section>

      <footer className="border-t border-warm/10 px-6 py-8 text-center text-xs text-muted sm:px-12">
        <p>© {new Date().getFullYear()} Qoyl · Brand Intelligence Platform</p>
        <p className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          <a
            href="https://qoyl-beta-alpha.vercel.app"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-cream"
          >
            Consumer app
          </a>
          <span aria-hidden>·</span>
          <span>Privacy Policy</span>
          <span aria-hidden>·</span>
          <a href="mailto:support@qoyl.live" className="hover:text-cream">
            support@qoyl.live
          </a>
        </p>
      </footer>
    </div>
  );
}

function FlaskIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 3h6M10 3v6.5L4.8 18a1.8 1.8 0 0 0 1.55 2.7h11.3a1.8 1.8 0 0 0 1.55-2.7L14 9.5V3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M7.5 14.5h9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function TrendIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M3 17l6-6 4 4 8-8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M15 7h6v6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LightbulbIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M9 18h6M10 21h4M8 14a5 5 0 1 1 8 0c-.8.9-1.5 1.7-1.5 3h-5c0-1.3-.7-2.1-1.5-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M8.5 12.5l2.2 2.2L15.5 9.5"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
