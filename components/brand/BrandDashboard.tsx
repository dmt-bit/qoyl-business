"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";

// Shapes returned by GET /api/business/brand/dashboard (see lib/scoreReportClient.ts).
export type ScoreProfile = {
  profile: { curl_type: string; porosity: string; climate: string; scalp: string };
  label: string;
  score: number;
  tier: "green" | "amber" | "red";
};
export type IngredientRow = {
  position: number;
  inciName: string;
  primaryFunction: string | null;
  ratings: { high: string | null; medium: string | null; low: string | null };
  flag: string | null;
};
export type ScoreReport =
  | { status: "not_in_catalog"; message: string }
  | {
      status: "ok";
      profiles: ScoreProfile[];
      percentile: number | null;
      ingredients: IngredientRow[];
      keyFinding: string;
    };
export type DashboardProduct = {
  id: string;
  name: string;
  category: { name: string; slug: string } | null;
  score_report: ScoreReport | null;
  geo: { city: string; count: number }[];
};
export type DashboardData = {
  brand: { id: string; name: string; brand_id: string | null };
  brand_matched: boolean;
  message?: string;
  products: DashboardProduct[];
};

// Every dynamic string in the dashboard goes through lc(), so the page reads
// lowercase like the rest of the qoyl copy.
const lc = (str: string | null | undefined): string => str?.toLowerCase() ?? "";

const MONO = "font-[family-name:var(--font-mono-apply)]";
const GROTESK = "font-[family-name:var(--font-grotesk)]";

function scoreColor(score: number): string {
  if (score >= 70) return "#2D7A3D";
  if (score >= 40) return "#C4831A";
  return "#B03030";
}

function ratingColor(rating: string | null): string {
  if (rating === "avoid") return "#B03030";
  if (rating === "caution") return "#C4831A";
  if (rating === "ok" || rating === "good") return "#2D7A3D";
  return "#bbb";
}

// Rule-based recommendations for a flagged ingredient, by function and the
// profile it hurts. Falls back to the scoring engine's own flag text.
function recommendation(row: IngredientRow): string {
  const fn = (row.primaryFunction ?? "").toLowerCase();
  const name = row.inciName.toLowerCase();
  if (fn.includes("humectant")) {
    return "consider sodium pca or sodium hyaluronate. both hold moisture better than glycerin or propylene glycol in low dew-point conditions.";
  }
  if (name.includes("sulfate")) {
    return "cocamidopropyl betaine or sodium cocoyl isethionate cleanse without the stripping that lowers scores for coily and high porosity profiles.";
  }
  if (fn.includes("silicone") || name.includes("dimethicone")) {
    return "dimethicone copolyol (water soluble) or a botanical oil blend avoids the buildup that hurts coily profiles.";
  }
  if (fn.includes("protein")) {
    return "reduce protein concentration or switch to a hydrolyzed protein with a smaller molecular weight for low porosity cuticles.";
  }
  return row.flag ?? "review this ingredient against the profiles it lowers.";
}

function insightFor(product: string, profiles: ScoreProfile[]): string {
  const best = profiles.reduce((a, b) => (a.score > b.score ? a : b));
  const worst = profiles.reduce((a, b) => (a.score < b.score ? a : b));
  const diff = best.score - worst.score;
  let insight: string;
  if (diff >= 40) {
    insight = `${product} is a strong match for ${best.label}. this is your core customer. the ${diff}-point gap with ${worst.label} is driven by specific ingredients flagged in section 03 below.`;
  } else if (best.score >= 70) {
    insight = `${product} performs consistently across hair types. strongest segment: ${best.label} at ${best.score}. focus marketing here for the highest conversion.`;
  } else {
    insight = `${product} has formulation gaps across most profiles. section 03 shows the specific ingredient changes that would move these scores.`;
  }
  return lc(insight);
}

export default function BrandDashboard({
  data,
  onRequestProduct,
}: {
  data: DashboardData;
  onRequestProduct: (name: string) => Promise<string>;
}) {
  const [active, setActive] = useState(0);

  if (!data.brand_matched || data.products.length === 0) {
    const subject = encodeURIComponent(`Products for ${data.brand.name} dashboard`);
    const body = encodeURIComponent("Please add the following products to my dashboard: ");
    return (
      <Shell brandName={data.brand.name}>
        <div className="px-6 py-20 text-center">
          <h2 className={`${GROTESK} text-2xl font-bold lowercase tracking-[-0.8px]`}>your dashboard is ready.</h2>
          <p className={`${GROTESK} mx-auto mt-2 max-w-md text-sm font-light text-[#666]`}>
            we need to add your products to the qoyl catalog before your intelligence report can generate.
          </p>
          <p className={`${GROTESK} mx-auto mt-6 max-w-md text-[13px] font-light text-[#888]`}>
            your products are added within 24 hours of your account activating. if you don&apos;t see them yet, reply to
            your welcome email.
          </p>
          <a
            href={`mailto:hey@qoyl.live?subject=${subject}&body=${body}`}
            className="mt-7 inline-block bg-[#0a0a0a] px-7 py-3 text-xs font-semibold lowercase text-white"
          >
            email hey@qoyl.live →
          </a>
        </div>
      </Shell>
    );
  }

  const product = data.products[Math.min(active, data.products.length - 1)];
  const productName = lc(product.name);
  // Unknown or blank cities are dropped, not shown.
  const cities = product.geo.filter((c) => c.city && c.city.trim() && c.city !== "unknown");
  const report = product.score_report;

  return (
    <Shell brandName={data.brand.name}>
      {data.products.length > 1 && (
        <div className="flex gap-6 overflow-x-auto border-b border-[#0a0a0a] px-6">
          {data.products.map((p, i) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setActive(i)}
              className={`${GROTESK} whitespace-nowrap py-3 text-sm lowercase ${
                i === active ? "border-b-2 border-[#0a0a0a] font-semibold text-[#0a0a0a]" : "text-[#888]"
              }`}
            >
              {lc(p.name)}
            </button>
          ))}
        </div>
      )}

      <div className="px-6 pb-16">
        {report?.status !== "ok" ? (
          <p className={`${GROTESK} py-16 text-center text-sm font-light text-[#888]`}>
            {report?.status === "not_in_catalog"
              ? lc(`${product.name} isn't in the scoring catalog yet.`)
              : "scores for this product aren't available right now. try again in a few minutes."}
          </p>
        ) : (
          <>
            <Section eyebrow="01 · scores" title={`how ${productName} scores`} sub="across six representative hair profiles">
              <ScoreGrid profiles={report.profiles} />
              <div className={`${GROTESK} mt-4 border border-[#e8e8e8] p-4 text-[13px] font-light leading-[1.85] text-[#666]`}>
                {insightFor(product.name, report.profiles)}
              </div>
              {report.percentile !== null && (
                <p className={`${MONO} mt-3 text-[10px] text-[#888]`}>
                  {lc(`scores in the ${report.percentile}th percentile for ${product.category?.name ?? "this category"} products on qoyl`)}
                </p>
              )}
            </Section>

            <SegmentMatrix profiles={report.profiles} />

            <Section eyebrow="03 · ingredients" title="what's driving your scores">
              <IngredientTable rows={report.ingredients.slice(0, 10)} />
              <Signals rows={report.ingredients.slice(0, 5).filter((r) => r.flag)} />
            </Section>
          </>
        )}

        <Section eyebrow="04 · demand" title="where your products are being searched" sub="last 30 days">
          {cities.length === 0 ? (
            <p className={`${GROTESK} text-sm font-light text-[#888]`}>
              search data builds over time. share qoyl.live with your audience to accelerate data collection.
            </p>
          ) : (
            <CityList cities={cities} />
          )}
        </Section>

        <Section eyebrow="05 · style match" title="style match activity">
          <p className={`${GROTESK} text-sm font-light text-[#888]`}>
            style match activity appears here as users engage with {productName}.
          </p>
        </Section>

        <Section eyebrow="06 · add products" title="add more products to your dashboard">
          <AddProductForm onSubmit={onRequestProduct} />
        </Section>
      </div>
    </Shell>
  );
}

function Shell({ brandName, children }: { brandName: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <header className="flex items-center justify-between border-b border-[#0a0a0a] px-6 py-4">
        <div className="flex items-baseline gap-4">
          <Link href="https://business.qoyl.live" className={`${GROTESK} text-[17px] font-bold lowercase`}>
            qoyl
          </Link>
          <span className={`${GROTESK} text-sm font-normal text-[#666]`}>{lc(brandName)}</span>
        </div>
        <span className={`${MONO} bg-black px-3 py-1 text-[9px] lowercase text-white`}>brand intelligence · $50/month</span>
      </header>
      <div className="mx-auto max-w-[900px]">{children}</div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  sub,
  children,
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="pt-8">
      <p className={`${MONO} text-[9px] lowercase tracking-[0.12em] text-[#888]`}>{eyebrow}</p>
      <h2 className={`${GROTESK} mt-2 text-[22px] font-bold lowercase tracking-[-0.8px]`}>{title}</h2>
      {sub && <p className={`${GROTESK} mt-1 text-[13px] font-light text-[#888]`}>{sub}</p>}
      <div className="mt-6">{children}</div>
    </section>
  );
}

function ScoreGrid({ profiles }: { profiles: ScoreProfile[] }) {
  const best = profiles.reduce((a, b) => (a.score > b.score ? a : b));
  const worst = profiles.reduce((a, b) => (a.score < b.score ? a : b));
  return (
    <div className="grid grid-cols-2 gap-px bg-[#0a0a0a] sm:grid-cols-3">
      {profiles.map((p) => {
        const isBest = p === best;
        const isWorst = p === worst && worst !== best;
        return (
          <div
            key={p.label}
            className="bg-white px-4 py-5 text-center"
            style={{ borderTop: isBest ? "3px solid #2D7A3D" : isWorst ? "3px solid #B03030" : "3px solid transparent" }}
          >
            {isBest && <p className={`${MONO} text-[8px] lowercase text-[#2D7A3D]`}>best performing</p>}
            {isWorst && <p className={`${MONO} text-[8px] lowercase text-[#B03030]`}>largest gap</p>}
            <p className={`${MONO} text-[8px] lowercase tracking-[0.04em] text-[#888]`}>{lc(p.label)}</p>
            <p className={`${MONO} text-[7px] lowercase text-[#bbb]`}>{lc(p.profile.climate)}</p>
            <p className={`${MONO} mt-3 text-[48px] font-bold leading-none`} style={{ color: scoreColor(p.score) }}>
              {p.score}
            </p>
            <p className={`${MONO} mt-1 text-[9px]`} style={{ color: scoreColor(p.score) }}>
              {p.score >= 70 ? "strong match" : p.score >= 40 ? "moderate match" : "poor match"}
            </p>
          </div>
        );
      })}
    </div>
  );
}

// Only the six profiles we actually score, in a 2 × 3 grid. No empty cells and
// no estimates: each tile is colored by its real score.
function SegmentMatrix({ profiles }: { profiles: ScoreProfile[] }) {
  const best = profiles.reduce((a, b) => (a.score > b.score ? a : b));
  const opportunity = profiles.find((p) => p.score >= 40 && p.score < 70);

  return (
    <Section eyebrow="02 · segments" title="which customers your formula was made for" sub="scores across the six profiles qoyl tests">
      <div className="grid grid-cols-2 gap-1 sm:grid-cols-3">
        {profiles.map((p) => (
          <div
            key={p.label}
            title={`${lc(p.label)}: ${p.score}`}
            className="flex min-h-[72px] flex-col justify-between p-3"
            style={{ background: scoreColor(p.score) }}
          >
            <span className={`${MONO} text-[9px] lowercase leading-tight text-white`}>{lc(p.label)}</span>
            <span className={`${MONO} text-[9px] text-white/80`}>{lc(p.profile.climate)}</span>
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-6 sm:grid-cols-2">
        <div>
          <p className={`${MONO} text-[9px] lowercase text-[#888]`}>best segment</p>
          <p className={`${GROTESK} mt-1 text-lg font-bold lowercase text-[#2D7A3D]`}>{lc(best.label)}</p>
          <p className={`${MONO} text-[10px] text-[#888]`}>scores {best.score}</p>
        </div>
        {opportunity && (
          <div>
            <p className={`${MONO} text-[9px] lowercase text-[#888]`}>opportunity segment</p>
            <p className={`${GROTESK} mt-1 text-lg font-bold lowercase text-[#C4831A]`}>{lc(opportunity.label)}</p>
            <p className={`${MONO} text-[10px] text-[#888]`}>scores {opportunity.score} · addressable gap</p>
            <p className={`${GROTESK} mt-2 text-xs font-light text-[#888]`}>
              a reformulation targeting this segment could expand your addressable market.
            </p>
          </div>
        )}
      </div>
    </Section>
  );
}

function IngredientTable({ rows }: { rows: IngredientRow[] }) {
  if (rows.length === 0) return <p className={`${GROTESK} text-sm text-[#888]`}>no ingredient data.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className={`${MONO} border-b border-[#0a0a0a] text-[9px] lowercase text-[#888]`}>
            <th className="py-2 pr-3">#</th>
            <th className="py-2 pr-3">ingredient</th>
            <th className="py-2 pr-3">function</th>
            <th className="py-2 pr-3">low</th>
            <th className="py-2 pr-3">med</th>
            <th className="py-2 pr-3">high</th>
            <th className="py-2">flag</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.position} className="border-b border-[#f0f0f0] align-top">
              <td className={`${MONO} py-2 pr-3 text-[10px] text-[#888]`}>{r.position}</td>
              <td className={`${GROTESK} py-2 pr-3 text-[13px]`}>{lc(r.inciName)}</td>
              <td className="py-2 pr-3">
                {r.primaryFunction && (
                  <span className={`${MONO} bg-black px-2 py-0.5 text-[8px] lowercase text-white`}>{lc(r.primaryFunction)}</span>
                )}
              </td>
              {(["low", "medium", "high"] as const).map((k) => (
                <td key={k} className={`${MONO} py-2 pr-3 text-[11px] font-bold`} style={{ color: ratingColor(r.ratings[k]) }}>
                  {r.ratings[k] ?? "—"}
                </td>
              ))}
              <td className={`${MONO} py-2 text-[10px]`} style={{ color: r.flag ? "#C4831A" : "#e8e8e8" }}>
                {r.flag ? lc(`⚠ ${r.flag}`) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Signals({ rows }: { rows: IngredientRow[] }) {
  if (rows.length === 0) {
    return (
      <div className="mt-6 border-l-[3px] border-[#2D7A3D] bg-[#f5fff8] px-5 py-4">
        <p className={`${MONO} text-[9px] lowercase text-[#2D7A3D]`}>no major formulation issues detected</p>
        <p className={`${GROTESK} mt-2 text-[13px] font-light leading-[1.75] text-[#666]`}>
          the score gaps are driven by hair profile compatibility, not formulation problems.
        </p>
      </div>
    );
  }
  return (
    <div className="mt-6 border-l-[3px] border-[#C4831A] bg-[#fffbf5] px-5 py-4">
      <p className={`${MONO} mb-3 text-[9px] lowercase text-[#C4831A]`}>reformulation signals</p>
      {rows.map((r) => (
        <div key={r.position} className="mb-4 last:mb-0">
          <p className={`${GROTESK} text-sm font-semibold`}>{lc(r.inciName)}</p>
          <p className={`${MONO} text-[9px] text-[#888]`}>at position {r.position}</p>
          <p className={`${GROTESK} mt-1 text-[13px] font-light leading-[1.75] text-[#666]`}>{lc(r.flag)}</p>
          <p className={`${GROTESK} mt-1 text-[13px] text-[#0a0a0a]`}>→ {lc(recommendation(r))}</p>
        </div>
      ))}
    </div>
  );
}

function CityList({ cities }: { cities: { city: string; count: number }[] }) {
  const max = Math.max(...cities.map((c) => c.count));
  return (
    <ol>
      {cities.map((c, i) => (
        <li key={c.city} className="border-b border-[#f0f0f0] py-3">
          <div className="flex items-baseline gap-4">
            <span className={`${MONO} w-6 text-lg font-bold text-[#e8e8e8]`}>{i + 1}</span>
            <span className={`${GROTESK} flex-1 text-sm font-medium`}>{lc(c.city)}</span>
            <span className={`${MONO} text-[10px] text-[#888]`}>{c.count} searches</span>
          </div>
          <div className="mt-2 h-0.5 bg-[#0a0a0a]" style={{ width: `${(c.count / max) * 100}%` }} />
        </li>
      ))}
    </ol>
  );
}

function AddProductForm({ onSubmit }: { onSubmit: (name: string) => Promise<string> }) {
  const [name, setName] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handle(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(await onSubmit(name));
    setBusy(false);
    setName("");
  }

  return (
    <form onSubmit={handle} className="flex flex-col gap-3 sm:flex-row">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="product name, e.g. moisture curl cream"
        className="flex-1 border border-[#0a0a0a] px-4 py-3 text-sm focus:outline-none"
      />
      <button type="submit" disabled={busy} className="bg-[#0a0a0a] px-6 py-3 text-xs font-semibold lowercase text-white disabled:opacity-50">
        request analysis →
      </button>
      {message && <p className={`${GROTESK} self-center text-sm text-[#666]`}>{message}</p>}
    </form>
  );
}
