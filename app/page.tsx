import Link from "next/link";

const pillars = [
  {
    title: "Ingredient Performance",
    description:
      "See how every ingredient in your formula performs against real consumer hair and scalp profiles.",
  },
  {
    title: "Consumer Demand Signals",
    description:
      "Track what type 4 consumers are actually asking for, before it shows up in your competitors' formulas.",
  },
  {
    title: "Reformulation Recommendations",
    description:
      "Get specific, ingredient-level suggestions to improve performance, appeal, and retention.",
  },
];

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="flex items-center justify-between px-6 py-6 sm:px-12">
        <span className="font-serif text-xl tracking-wide text-cream">
          QOYL <span className="text-bronze2">BUSINESS</span>
        </span>
        <Link
          href="/login"
          className="text-sm text-muted hover:text-cream transition-colors"
        >
          Brand login
        </Link>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 sm:px-12 text-center">
        <p className="text-xs uppercase tracking-[0.3em] text-bronze2 mb-6">
          B2B Brand Intelligence
        </p>
        <h1 className="font-serif text-4xl sm:text-6xl leading-tight max-w-3xl text-cream">
          Ingredient-level intelligence for your type 4 hair products.
        </h1>
        <p className="mt-6 max-w-2xl text-lg sm:text-xl text-sand leading-relaxed">
          See exactly how your formulas score across real consumer profiles —
          and what to change.
        </p>

        <Link
          href="/apply"
          className="mt-10 inline-flex items-center gap-2 rounded-full bg-bronze px-8 py-4 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
        >
          Apply for brand access
          <span aria-hidden>→</span>
        </Link>
      </main>

      <section className="px-6 pb-20 sm:px-12">
        <div className="mx-auto grid max-w-5xl gap-6 sm:grid-cols-3">
          {pillars.map((pillar) => (
            <div
              key={pillar.title}
              className="rounded-lg border border-warm/10 bg-warm/[0.03] p-8 text-left"
            >
              <h2 className="font-serif text-xl text-bronze2">
                {pillar.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-muted">
                {pillar.description}
              </p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-6 pb-8 text-center text-xs text-muted sm:px-12">
        © {new Date().getFullYear()} Qoyl. Brand intelligence for the next
        generation of type 4 hair care.
      </footer>
    </div>
  );
}
