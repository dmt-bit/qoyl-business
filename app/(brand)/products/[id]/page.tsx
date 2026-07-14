import { notFound } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import {
  getProductScoreBreakdown,
  getReformulationSignals,
  getPorosityDistribution,
  scoreTier,
  SCORE_TIER_TEXT_CLASSES,
  RATING_BADGE_CLASSES,
  POROSITY_LEVELS,
  type Porosity,
} from "@/lib/brandData";
import OwnershipGuard from "./OwnershipGuard";

const POROSITY_LABELS: Record<Porosity, string> = {
  low: "Low Porosity",
  medium: "Medium Porosity",
  high: "High Porosity",
};

export const dynamic = "force-dynamic";

export default async function ProductPage({ params }: { params: { id: string } }) {
  const supabaseAdmin = getSupabaseAdmin();
  const { data: product } = await supabaseAdmin
    .from("brand_products")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!product) notFound();

  const ingredientList: string = product.ingredient_list ?? "";

  const [breakdown, porosityDistribution, reformLow, reformMedium, reformHigh] =
    await Promise.all([
      getProductScoreBreakdown(ingredientList),
      getPorosityDistribution(),
      getReformulationSignals(ingredientList, "low"),
      getReformulationSignals(ingredientList, "medium"),
      getReformulationSignals(ingredientList, "high"),
    ]);

  const reformulations = [...reformLow, ...reformMedium, ...reformHigh].filter(
    (r) => r.replacement !== null
  );

  const totalProfiles = POROSITY_LEVELS.reduce(
    (sum, p) => sum + porosityDistribution[p],
    0
  );

  const scoredPorosities = POROSITY_LEVELS.filter(
    (p) => breakdown.overallByPorosity[p] !== null
  );
  const lowestPorosity =
    scoredPorosities.length > 0
      ? scoredPorosities.reduce((worst, p) =>
          breakdown.overallByPorosity[p]! < breakdown.overallByPorosity[worst]! ? p : worst
        )
      : null;
  const highestPorosity =
    scoredPorosities.length > 0
      ? scoredPorosities.reduce((best, p) =>
          breakdown.overallByPorosity[p]! > breakdown.overallByPorosity[best]! ? p : best
        )
      : null;

  const watchList = breakdown.ingredientBreakdown.filter(
    (row) => row.flag === "caution" || row.flag === "avoid"
  );

  const lowestPorosityDrivers = lowestPorosity
    ? [...breakdown.ingredientBreakdown]
        .filter((row) => row[lowestPorosity] !== null)
        .sort((a, b) => a[lowestPorosity]! - b[lowestPorosity]!)
        .slice(0, 2)
    : [];

  return (
    <div className="px-6 py-12 sm:px-12">
      <OwnershipGuard ownerBrandId={product.brand_id} />
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-wider text-muted">
          {product.category ?? "Uncategorized"}
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-1">
          {product.product_name}
        </h1>

        {breakdown.unmatchedIngredients.length > 0 && (
          <p className="mt-4 text-xs text-muted">
            {breakdown.unmatchedIngredients.length} ingredient
            {breakdown.unmatchedIngredients.length === 1 ? "" : "s"} not yet in
            our catalog and excluded from scoring:{" "}
            {breakdown.unmatchedIngredients.join(", ")}
          </p>
        )}

        {/* Section 1 -- Score Summary */}
        <section className="mt-10 grid gap-4 sm:grid-cols-3">
          {POROSITY_LEVELS.map((porosity) => {
            const score = breakdown.overallByPorosity[porosity];
            const pct =
              totalProfiles > 0
                ? Math.round((porosityDistribution[porosity] / totalProfiles) * 100)
                : null;
            return (
              <div
                key={porosity}
                className="rounded-lg border border-warm/10 bg-warm/[0.03] p-8 text-center"
              >
                <p className="text-xs uppercase tracking-wider text-muted">
                  {POROSITY_LABELS[porosity]}
                </p>
                <p
                  className={`mt-3 font-serif text-5xl ${
                    score !== null ? SCORE_TIER_TEXT_CLASSES[scoreTier(score)] : "text-muted"
                  }`}
                >
                  {score !== null ? score : "—"}
                </p>
                <p className="mt-3 text-xs text-muted">
                  {pct !== null ? `${pct}% of Qoyl users` : "No user data yet"}
                </p>
              </div>
            );
          })}
        </section>

        {/* Section 2 -- Ingredient Breakdown */}
        <section className="mt-14">
          <h2 className="font-serif text-2xl text-cream mb-4">
            Ingredient breakdown
          </h2>
          <div className="overflow-x-auto rounded-lg border border-warm/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
                <tr>
                  <th className="px-4 py-3">Ingredient</th>
                  <th className="px-4 py-3">Low</th>
                  <th className="px-4 py-3">Medium</th>
                  <th className="px-4 py-3">High</th>
                  <th className="px-4 py-3">Flag</th>
                </tr>
              </thead>
              <tbody>
                {breakdown.ingredientBreakdown.map((row) => (
                  <tr key={row.name} className="border-t border-warm/10">
                    <td className="px-4 py-3 text-cream">{row.name}</td>
                    <td className="px-4 py-3 text-sand">{row.low ?? "—"}</td>
                    <td className="px-4 py-3 text-sand">{row.medium ?? "—"}</td>
                    <td className="px-4 py-3 text-sand">{row.high ?? "—"}</td>
                    <td className="px-4 py-3">
                      {row.flag ? (
                        <span
                          className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider ${RATING_BADGE_CLASSES[row.flag]}`}
                        >
                          {row.flag}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                ))}
                {breakdown.ingredientBreakdown.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted">
                      No scored ingredients yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Section 3 -- Key Insights */}
        <section className="mt-14 grid gap-6 sm:grid-cols-3">
          <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
            <h3 className="font-serif text-lg text-red">Biggest opportunity</h3>
            {lowestPorosity ? (
              <p className="mt-3 text-sm leading-relaxed text-sand">
                {POROSITY_LABELS[lowestPorosity]} scores lowest at{" "}
                {breakdown.overallByPorosity[lowestPorosity]}.
                {lowestPorosityDrivers.length > 0 && (
                  <>
                    {" "}
                    Driven mainly by{" "}
                    {lowestPorosityDrivers.map((r) => r.name).join(" and ")}.
                  </>
                )}
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">Not enough data yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
            <h3 className="font-serif text-lg text-green">Strongest segment</h3>
            {highestPorosity ? (
              <p className="mt-3 text-sm leading-relaxed text-sand">
                {POROSITY_LABELS[highestPorosity]} scores highest at{" "}
                {breakdown.overallByPorosity[highestPorosity]}.
              </p>
            ) : (
              <p className="mt-3 text-sm text-muted">Not enough data yet.</p>
            )}
          </div>

          <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
            <h3 className="font-serif text-lg text-amber">Watch list</h3>
            {watchList.length > 0 ? (
              <ul className="mt-3 space-y-1 text-sm text-sand">
                {watchList.map((row) => (
                  <li key={row.name}>
                    {row.name}{" "}
                    <span className="text-xs text-muted uppercase">
                      ({row.flag})
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-muted">
                No flagged ingredients — clean formula.
              </p>
            )}
          </div>
        </section>

        {/* Section 4 -- Reformulation Signals */}
        <section className="mt-14 mb-16">
          <h2 className="font-serif text-2xl text-cream mb-4">
            Reformulation signals
          </h2>
          {reformulations.length === 0 ? (
            <p className="text-sm text-muted">
              No swap suggestions — no flagged ingredients found, or no
              stronger alternative exists in our catalog yet.
            </p>
          ) : (
            <div className="space-y-3">
              {reformulations.map((r, i) => (
                <div
                  key={`${r.ingredient}-${r.porosity}-${i}`}
                  className="rounded-lg border border-warm/10 bg-warm/[0.03] p-5 text-sm text-sand"
                >
                  Consider replacing{" "}
                  <span className="text-cream">{r.ingredient}</span> with{" "}
                  <span className="text-bronze2">{r.replacement}</span> —
                  projected score improvement:{" "}
                  <span className="text-green">
                    +{r.projectedImprovement} points
                  </span>{" "}
                  for {r.porosity} porosity hair.
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
