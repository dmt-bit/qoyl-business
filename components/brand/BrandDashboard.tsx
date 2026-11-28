"use client";

import { Fragment, useState, type FormEvent } from "react";
import Link from "next/link";
import ReportsSection, { type SentReport } from "./ReportsSection";

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
  reports,
}: {
  data: DashboardData;
  onRequestProduct: (name: string) => Promise<string>;
  reports: { surveyCompleted: boolean; reports: SentReport[] };
}) {
  // null = overview, number = product index
  const [activeProduct, setActiveProduct] = useState<number | null>(null);

  if (!data.brand_matched || data.products.length === 0) {
    const subject = encodeURIComponent(`Products for ${data.brand.name} dashboard`);
    const body = encodeURIComponent("Please add the following products to my dashboard: ");
    return (
      <Shell brandName={data.brand.name} onLogoClick={() => setActiveProduct(null)}>
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

  if (activeProduct !== null) {
    const product = data.products[Math.min(activeProduct, data.products.length - 1)];
    return (
      <ProductView
        product={product}
        allProducts={data.products}
        brandName={data.brand.name}
        activeIndex={activeProduct}
        onSelectProduct={setActiveProduct}
        onBack={() => setActiveProduct(null)}
        onRequestProduct={onRequestProduct}
        reports={reports}
      />
    );
  }

  return (
    <OverviewView
      data={data}
      onRequestProduct={onRequestProduct}
      reports={reports}
      onSelectProduct={setActiveProduct}
    />
  );
}

// ─── Overview ────────────────────────────────────────────────────────────────

function OverviewView({
  data,
  onRequestProduct,
  reports,
  onSelectProduct,
}: {
  data: DashboardData;
  onRequestProduct: (name: string) => Promise<string>;
  reports: { surveyCompleted: boolean; reports: SentReport[] };
  onSelectProduct: (i: number) => void;
}) {
  // Aggregate all cities across all products (deduplicated by city name, summed)
  const allCities = (() => {
    const counts = new Map<string, number>();
    for (const p of data.products) {
      for (const c of p.geo) {
        if (!c.city || c.city.trim() === "" || c.city === "unknown") continue;
        counts.set(c.city, (counts.get(c.city) ?? 0) + c.count);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([city, count]) => ({ city, count }));
  })();

  const scoredProducts = data.products.filter((p) => p.score_report?.status === "ok");
  const totalFlags = scoredProducts.reduce((n, p) => {
    const r = p.score_report;
    if (r?.status !== "ok") return n;
    return n + r.ingredients.filter((i) => i.flag).length;
  }, 0);
  const avgBestScore =
    scoredProducts.length === 0
      ? null
      : Math.round(
          scoredProducts.reduce((n, p) => {
            const r = p.score_report;
            if (r?.status !== "ok") return n;
            return n + Math.max(...r.profiles.map((pr) => pr.score));
          }, 0) / scoredProducts.length
        );

  return (
    <Shell brandName={data.brand.name} onLogoClick={() => {}}>
      <div className="px-6 pb-16">
        {/* Brand summary stats */}
        <section className="pt-8">
          <p className={`${MONO} text-[9px] lowercase tracking-[0.12em] text-[#888]`}>brand overview</p>
          <h2 className={`${GROTESK} mt-2 text-[22px] font-bold lowercase tracking-[-0.8px]`}>{lc(data.brand.name)}</h2>
          <div className="mt-6 grid grid-cols-2 gap-px bg-[#0a0a0a] sm:grid-cols-4">
            {[
              { label: "products tracked", value: String(data.products.length) },
              { label: "avg peak score", value: avgBestScore !== null ? String(avgBestScore) : "—" },
              { label: "reformulation signals", value: String(totalFlags) },
              { label: "demand cities", value: String(allCities.length) },
            ].map(({ label, value }) => (
              <div key={label} className="bg-white px-5 py-6">
                <p className={`${MONO} text-[8px] lowercase tracking-[0.08em] text-[#888]`}>{label}</p>
                <p className={`${GROTESK} mt-2 text-[36px] font-bold leading-none tracking-[-1.5px]`}>{value}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Product cards grid */}
        <section className="pt-10">
          <p className={`${MONO} text-[9px] lowercase tracking-[0.12em] text-[#888]`}>01 · products</p>
          <h2 className={`${GROTESK} mt-2 text-[22px] font-bold lowercase tracking-[-0.8px]`}>your catalog</h2>
          <p className={`${GROTESK} mt-1 text-[13px] font-light text-[#888]`}>click any product for the full analysis</p>
          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            {data.products.map((p, i) => {
              const r = p.score_report;
              const hasReport = r?.status === "ok";
              const best = hasReport ? Math.max(...r.profiles.map((pr) => pr.score)) : null;
              const worst = hasReport ? Math.min(...r.profiles.map((pr) => pr.score)) : null;
              const bestProfile = hasReport ? r.profiles.reduce((a, b) => (a.score > b.score ? a : b)) : null;
              const flags = hasReport ? r.ingredients.filter((ing) => ing.flag).length : 0;
              const topCity = p.geo.find((c) => c.city && c.city !== "unknown");
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => onSelectProduct(i)}
                  className="group text-left border border-[#e8e8e8] p-5 hover:border-[#0a0a0a] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className={`${GROTESK} text-sm font-semibold lowercase truncate`}>{lc(p.name)}</p>
                      {p.category && (
                        <p className={`${MONO} text-[9px] lowercase text-[#aaa] mt-0.5`}>{lc(p.category.name)}</p>
                      )}
                    </div>
                    <span className={`${MONO} shrink-0 text-[9px] text-[#888] group-hover:text-[#0a0a0a] transition-colors`}>
                      view →
                    </span>
                  </div>
                  {hasReport ? (
                    <div className="mt-4 flex items-end justify-between gap-4">
                      <div>
                        <p className={`${MONO} text-[8px] text-[#888]`}>peak score</p>
                        <p
                          className={`${MONO} text-[32px] font-bold leading-none`}
                          style={{ color: scoreColor(best!) }}
                        >
                          {best}
                        </p>
                        {bestProfile && (
                          <p className={`${MONO} mt-1 text-[9px] text-[#aaa]`}>{lc(bestProfile.label)}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="flex gap-3 justify-end">
                          {worst !== null && worst !== best && (
                            <div>
                              <p className={`${MONO} text-[8px] text-[#888]`}>low</p>
                              <p className={`${MONO} text-lg font-bold`} style={{ color: scoreColor(worst) }}>{worst}</p>
                            </div>
                          )}
                          {flags > 0 && (
                            <div>
                              <p className={`${MONO} text-[8px] text-[#888]`}>flags</p>
                              <p className={`${MONO} text-lg font-bold text-[#C4831A]`}>{flags}</p>
                            </div>
                          )}
                        </div>
                        {topCity && (
                          <p className={`${MONO} mt-2 text-[9px] text-[#aaa]`}>top: {lc(topCity.city)}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className={`${GROTESK} mt-4 text-[12px] font-light text-[#aaa]`}>
                      {r?.status === "not_in_catalog" ? "not yet in scoring catalog" : "scores loading"}
                    </p>
                  )}
                </button>
              );
            })}
          </div>
        </section>

        {/* Brand-wide demand map */}
        <Section eyebrow="02 · demand" title="where your brand is being searched" sub="all products · last 30 days">
          {allCities.length === 0 ? (
            <p className={`${GROTESK} text-sm font-light text-[#888]`}>
              search data builds over time. share qoyl.live with your audience to accelerate data collection.
            </p>
          ) : (
            <DemandMap cities={allCities} />
          )}
        </Section>

        {/* Shareholder report and requests at brand level */}
        <Section eyebrow="03 · shareholder report" title="export a report for stakeholders">
          <ShareholderReport
            brandName={data.brand.name}
            productName={data.products.map((p) => p.name).join(", ")}
            report={data.products[0]?.score_report ?? null}
            cities={allCities}
          />
        </Section>

        <Section eyebrow="04 · requests" title="request analysis or support">
          <RequestPanel onSubmit={onRequestProduct} brandName={data.brand.name} productName={data.products[0]?.name ?? ""} />
        </Section>

        <Section eyebrow="05 · add products" title="add more products to your dashboard">
          <AddProductForm onSubmit={onRequestProduct} />
        </Section>

        <ReportsSection surveyCompleted={reports.surveyCompleted} reports={reports.reports} />
      </div>
    </Shell>
  );
}

// ─── Product drill-down ───────────────────────────────────────────────────────

function ProductView({
  product,
  allProducts,
  brandName,
  activeIndex,
  onSelectProduct,
  onBack,
  onRequestProduct,
  reports,
}: {
  product: DashboardProduct;
  allProducts: DashboardProduct[];
  brandName: string;
  activeIndex: number;
  onSelectProduct: (i: number) => void;
  onBack: () => void;
  onRequestProduct: (name: string) => Promise<string>;
  reports: { surveyCompleted: boolean; reports: SentReport[] };
}) {
  const productName = lc(product.name);
  const cities = product.geo.filter((c) => c.city && c.city.trim() && c.city !== "unknown");
  const report = product.score_report;

  return (
    <Shell brandName={brandName} onLogoClick={onBack}>
      {/* Product tabs */}
      <div className="flex gap-0 overflow-x-auto border-b border-[#0a0a0a]">
        <button
          type="button"
          onClick={onBack}
          className={`${MONO} shrink-0 px-5 py-3 text-[9px] lowercase tracking-[0.08em] text-[#888] hover:text-[#0a0a0a] border-r border-[#e8e8e8]`}
        >
          ← overview
        </button>
        {allProducts.map((p, i) => (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelectProduct(i)}
            className={`${GROTESK} whitespace-nowrap px-5 py-3 text-sm lowercase ${
              i === activeIndex
                ? "border-b-2 border-[#0a0a0a] font-semibold text-[#0a0a0a]"
                : "text-[#888] hover:text-[#0a0a0a]"
            }`}
          >
            {lc(p.name)}
          </button>
        ))}
      </div>

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

        <Section eyebrow="04 · demand" title="where this product is being searched" sub="last 30 days">
          {cities.length === 0 ? (
            <p className={`${GROTESK} text-sm font-light text-[#888]`}>
              search data builds over time. share qoyl.live with your audience to accelerate data collection.
            </p>
          ) : (
            <DemandMap cities={cities} />
          )}
        </Section>

        <Section eyebrow="05 · style match" title="style match activity">
          <p className={`${GROTESK} text-sm font-light text-[#888]`}>
            style match activity appears here as users engage with {productName}.
          </p>
        </Section>

        <Section eyebrow="06 · shareholder report" title="export a report for stakeholders">
          <ShareholderReport brandName={brandName} productName={product.name} report={report} cities={cities} />
        </Section>

        <Section eyebrow="07 · requests" title="request analysis or support">
          <RequestPanel onSubmit={onRequestProduct} brandName={brandName} productName={product.name} />
        </Section>

        <ReportsSection surveyCompleted={reports.surveyCompleted} reports={reports.reports} />
      </div>
    </Shell>
  );
}

function Shell({ brandName, children, onLogoClick }: { brandName: string; children: React.ReactNode; onLogoClick: () => void }) {
  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]">
      <header className="flex items-center justify-between border-b border-[#0a0a0a] px-6 py-4">
        <div className="flex items-baseline gap-4">
          <button type="button" onClick={onLogoClick} className={`${GROTESK} text-[17px] font-bold lowercase hover:opacity-70 transition-opacity`}>
            qoyl
          </button>
          <span className={`${GROTESK} text-sm font-normal text-[#666]`}>{lc(brandName)}</span>
        </div>
        <span className={`${MONO} bg-black px-3 py-1 text-[9px] lowercase text-white`}>brand intelligence</span>
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

// US state centroids (approximate) for demand map dots
const STATE_DOTS: Record<string, { x: number; y: number; abbr: string }> = {
  "new york": { x: 820, y: 185, abbr: "NY" },
  "los angeles": { x: 95, y: 310, abbr: "LA" },
  "chicago": { x: 650, y: 200, abbr: "IL" },
  "houston": { x: 500, y: 390, abbr: "TX" },
  "phoenix": { x: 175, y: 320, abbr: "AZ" },
  "philadelphia": { x: 800, y: 205, abbr: "PA" },
  "san antonio": { x: 480, y: 405, abbr: "TX" },
  "san diego": { x: 110, y: 330, abbr: "CA" },
  "dallas": { x: 505, y: 370, abbr: "TX" },
  "san jose": { x: 70, y: 265, abbr: "CA" },
  "austin": { x: 495, y: 390, abbr: "TX" },
  "jacksonville": { x: 740, y: 350, abbr: "FL" },
  "fort worth": { x: 500, y: 370, abbr: "TX" },
  "columbus": { x: 715, y: 220, abbr: "OH" },
  "charlotte": { x: 755, y: 285, abbr: "NC" },
  "san francisco": { x: 65, y: 255, abbr: "CA" },
  "indianapolis": { x: 680, y: 230, abbr: "IN" },
  "seattle": { x: 100, y: 90, abbr: "WA" },
  "denver": { x: 345, y: 240, abbr: "CO" },
  "washington": { x: 790, y: 240, abbr: "DC" },
  "nashville": { x: 695, y: 290, abbr: "TN" },
  "oklahoma city": { x: 490, y: 320, abbr: "OK" },
  "el paso": { x: 345, y: 375, abbr: "TX" },
  "boston": { x: 855, y: 165, abbr: "MA" },
  "portland": { x: 100, y: 115, abbr: "OR" },
  "las vegas": { x: 155, y: 295, abbr: "NV" },
  "memphis": { x: 650, y: 310, abbr: "TN" },
  "louisville": { x: 695, y: 255, abbr: "KY" },
  "baltimore": { x: 795, y: 230, abbr: "MD" },
  "milwaukee": { x: 665, y: 185, abbr: "WI" },
  "atlanta": { x: 715, y: 325, abbr: "GA" },
  "miami": { x: 755, y: 420, abbr: "FL" },
  "minneapolis": { x: 565, y: 150, abbr: "MN" },
  "detroit": { x: 710, y: 190, abbr: "MI" },
  "richmond": { x: 795, y: 255, abbr: "VA" },
  "new orleans": { x: 630, y: 385, abbr: "LA" },
  "cleveland": { x: 735, y: 200, abbr: "OH" },
  "tampa": { x: 735, y: 395, abbr: "FL" },
  "pittsburgh": { x: 760, y: 215, abbr: "PA" },
  "kansas city": { x: 575, y: 270, abbr: "MO" },
  "sacramento": { x: 85, y: 240, abbr: "CA" },
  "salt lake city": { x: 230, y: 215, abbr: "UT" },
  "raleigh": { x: 775, y: 280, abbr: "NC" },
  "cincinnati": { x: 710, y: 240, abbr: "OH" },
  "st. louis": { x: 630, y: 265, abbr: "MO" },
};

function normalizeCity(city: string): string {
  return city.toLowerCase().trim().replace(/,.*$/, "").trim();
}

function DemandMap({ cities }: { cities: { city: string; count: number }[] }) {
  const max = Math.max(...cities.map((c) => c.count), 1);
  const matched = cities
    .map((c) => ({ ...c, dot: STATE_DOTS[normalizeCity(c.city)] }))
    .filter((c) => c.dot);
  const unmatched = cities.filter((c) => !STATE_DOTS[normalizeCity(c.city)]);

  return (
    <div>
      <div className="relative overflow-hidden border border-[#e8e8e8] bg-[#fafafa]">
        {/* US outline SVG — simplified lower-48 shape */}
        <svg viewBox="0 0 960 600" className="w-full" aria-hidden="true" style={{ display: "block" }}>
          {/* Background */}
          <rect width="960" height="600" fill="#fafafa" />
          {/* Simplified US landmass */}
          <path
            d="M140,80 L200,70 L260,65 L320,68 L400,72 L480,70 L560,68 L640,70 L720,72 L800,70 L870,80 L890,100 L900,130 L895,160 L880,180 L870,200 L880,220 L885,250 L875,280 L865,310 L850,335 L835,355 L815,370 L795,375 L775,380 L760,395 L750,415 L745,440 L735,450 L720,445 L710,430 L700,415 L690,400 L675,390 L655,392 L640,400 L625,405 L605,400 L590,390 L575,380 L560,375 L545,382 L535,400 L525,415 L510,420 L495,415 L480,405 L465,398 L445,400 L430,410 L415,415 L395,410 L375,400 L355,395 L335,400 L315,405 L295,400 L275,390 L255,380 L235,375 L215,380 L195,390 L175,392 L158,385 L145,370 L135,350 L128,325 L125,300 L128,275 L132,250 L130,225 L125,200 L120,175 L118,150 L122,120 L130,100 Z"
            fill="#ebebeb"
            stroke="#ccc"
            strokeWidth="1"
          />
          {/* Florida peninsula */}
          <path
            d="M700,415 L710,430 L720,445 L735,460 L745,475 L748,495 L742,510 L730,520 L715,515 L705,500 L698,480 L695,460 L698,440 Z"
            fill="#ebebeb"
            stroke="#ccc"
            strokeWidth="1"
          />
          {/* Demand dots */}
          {matched.map((c) => {
            const r = 4 + (c.count / max) * 18;
            return (
              <g key={c.city}>
                <circle cx={c.dot!.x} cy={c.dot!.y} r={r} fill="#0a0a0a" opacity={0.12 + (c.count / max) * 0.55} />
                <circle cx={c.dot!.x} cy={c.dot!.y} r={2.5} fill="#0a0a0a" opacity={0.9} />
                <text
                  x={c.dot!.x}
                  y={c.dot!.y - r - 4}
                  textAnchor="middle"
                  fontSize="8"
                  fill="#0a0a0a"
                  fontFamily="monospace"
                  opacity={0.75}
                >
                  {normalizeCity(c.city)}
                </text>
              </g>
            );
          })}
        </svg>
        {matched.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center">
            <p className={`${GROTESK} text-sm text-[#aaa]`}>map builds as search data comes in</p>
          </div>
        )}
      </div>
      {/* Ranked list below map */}
      <div className="mt-6">
        <CityList cities={cities} />
      </div>
      {unmatched.length > 0 && (
        <p className={`${MONO} mt-3 text-[9px] text-[#aaa]`}>
          {unmatched.map((c) => lc(c.city)).join(" · ")} · not shown on map
        </p>
      )}
    </div>
  );
}

function ShareholderReport({
  brandName,
  productName,
  report,
  cities,
}: {
  brandName: string;
  productName: string;
  report: ScoreReport | null;
  cities: { city: string; count: number }[];
}) {
  const [sent, setSent] = useState(false);
  const subject = encodeURIComponent(`Shareholder report request — ${brandName}`);
  const body = encodeURIComponent(
    `Hi,\n\nPlease generate a shareholder-ready report for ${brandName} covering:\n- Product: ${productName}\n- Geographic demand summary\n- Score breakdown across hair profiles\n- Key reformulation signals\n- Market opportunity overview\n\nThank you.`
  );

  if (sent) {
    return (
      <div className="border-l-[3px] border-[#2D7A3D] bg-[#f5fff8] px-5 py-4">
        <p className={`${MONO} text-[9px] lowercase text-[#2D7A3D]`}>request received</p>
        <p className={`${GROTESK} mt-2 text-[13px] font-light text-[#666]`}>
          we&apos;ll prepare a shareholder-ready report and send it within 2 business days.
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className={`${GROTESK} mb-6 text-[13px] font-light leading-[1.85] text-[#666]`}>
        get a formatted report suitable for investors and stakeholders — covering your product scores,
        geographic demand, segment breakdown, and market opportunity. formatted for a board presentation.
      </p>
      <div className="grid gap-3 sm:grid-cols-2 mb-6">
        {[
          ["product score summary", `how ${lc(productName)} scores across six hair profiles`],
          ["segment opportunity", "which customer segments your formula wins, and where the gap is"],
          ["geographic demand", `${cities.length > 0 ? `${cities.length} cities` : "demand data"} mapped and ranked`],
          ["reformulation signals", "ingredient-level findings and swap recommendations"],
        ].map(([title, desc]) => (
          <div key={title} className="border border-[#e8e8e8] p-4">
            <p className={`${MONO} text-[9px] lowercase text-[#0a0a0a]`}>{title}</p>
            <p className={`${GROTESK} mt-1 text-[12px] font-light text-[#888]`}>{desc}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <a
          href={`mailto:hey@qoyl.live?subject=${subject}&body=${body}`}
          onClick={() => setSent(true)}
          className={`${MONO} inline-block bg-[#0a0a0a] px-6 py-3 text-[10px] lowercase text-white`}
        >
          request shareholder report →
        </a>
        <p className={`${GROTESK} self-center text-[12px] font-light text-[#888]`}>delivered within 2 business days</p>
      </div>
    </div>
  );
}

const REQUEST_TYPES = [
  {
    id: "reformulation",
    label: "reformulation consultation",
    desc: "walk through specific ingredient swaps with the qoyl team. we'll show you exactly what moves your score for your target segment.",
    example: `e.g. shea moisture wants to expand their curl milk into the low porosity market. we map which humectant is flagging, suggest sodium pca as a swap, and project the score shift.`,
  },
  {
    id: "competitor",
    label: "competitive formula analysis",
    desc: "compare your product scores against top competitors in your category. see where you win and where the gap is.",
    example: "e.g. how does your moisture cream score against mielle, pattern, and aunt jackie's for type 4 hair?",
  },
  {
    id: "segment",
    label: "custom segment report",
    desc: "request a deep dive into any specific segment — a curl type, porosity level, or climate region — and what it takes to win there.",
    example: "e.g. what does a product need to score 80+ for high porosity, humid climate customers?",
  },
  {
    id: "catalog",
    label: "full catalog audit",
    desc: "score your entire product line and get a ranked view of which products to reformulate first and which to market harder.",
    example: "e.g. surface which of your 12 skus are ready to lead and which are drag.",
  },
];

function RequestPanel({ onSubmit, brandName, productName }: { onSubmit: (name: string) => Promise<string>; brandName: string; productName: string }) {
  const [selected, setSelected] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setBusy(true);
    const req = REQUEST_TYPES.find((r) => r.id === selected);
    const subject = encodeURIComponent(`${req?.label ?? selected} — ${brandName}`);
    const noteText = note.trim() ? `\n\nAdditional context:\n${note}` : "";
    const body = encodeURIComponent(`Hi,\n\nRequesting: ${req?.label ?? selected}\nBrand: ${brandName}\nProduct: ${productName}${noteText}\n\nThank you.`);
    // Open mailto and optimistically show success
    window.location.href = `mailto:hey@qoyl.live?subject=${subject}&body=${body}`;
    await new Promise((r) => setTimeout(r, 300));
    setSent(req?.label ?? selected);
    setBusy(false);
  }

  if (sent) {
    return (
      <div className="border-l-[3px] border-[#2D7A3D] bg-[#f5fff8] px-5 py-4">
        <p className={`${MONO} text-[9px] lowercase text-[#2D7A3D]`}>request submitted</p>
        <p className={`${GROTESK} mt-2 text-[13px] font-light text-[#666]`}>
          your {lc(sent)} request is on its way. we&apos;ll follow up within 1 business day.
        </p>
        <button type="button" onClick={() => { setSent(null); setSelected(null); setNote(""); }} className={`${MONO} mt-3 text-[10px] lowercase text-[#888] underline`}>
          submit another →
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit}>
      <p className={`${GROTESK} mb-5 text-[13px] font-light text-[#888]`}>
        select the type of analysis or support you need.
      </p>
      <div className="grid gap-2 sm:grid-cols-2 mb-6">
        {REQUEST_TYPES.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSelected(r.id === selected ? null : r.id)}
            className={`text-left border p-4 transition-colors ${selected === r.id ? "border-[#0a0a0a] bg-[#0a0a0a] text-white" : "border-[#e8e8e8] hover:border-[#0a0a0a]"}`}
          >
            <p className={`${MONO} text-[9px] lowercase ${selected === r.id ? "text-[#aaa]" : "text-[#0a0a0a]"}`}>{r.label}</p>
            <p className={`${GROTESK} mt-1 text-[12px] font-light leading-[1.6] ${selected === r.id ? "text-[#ddd]" : "text-[#666]"}`}>{r.desc}</p>
            {selected === r.id && (
              <p className={`${MONO} mt-2 text-[9px] leading-[1.6] text-[#aaa]`}>{r.example}</p>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <div className="mb-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="anything specific you want us to focus on? (optional)"
            rows={3}
            className={`${GROTESK} w-full border border-[#e8e8e8] px-4 py-3 text-sm font-light focus:border-[#0a0a0a] focus:outline-none resize-none`}
          />
        </div>
      )}
      <button
        type="submit"
        disabled={!selected || busy}
        className={`${MONO} bg-[#0a0a0a] px-6 py-3 text-[10px] lowercase text-white disabled:opacity-30`}
      >
        {busy ? "sending..." : "submit request →"}
      </button>
    </form>
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
