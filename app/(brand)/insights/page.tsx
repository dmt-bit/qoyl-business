import {
  getConsumerDemandSignals,
  getHairProfileBreakdown,
  getIngredientFlagSignals,
  getProductRequestSignals,
  scoreTier,
  SCORE_TIER_TEXT_CLASSES,
} from "@/lib/brandData";
import { getStyleMatchSignals } from "@/lib/styleSignals";

export const dynamic = "force-dynamic";

const POROSITY_LABELS: Record<string, string> = {
  low: "Low Porosity",
  medium: "Medium Porosity",
  high: "High Porosity",
};

const EMPTY_STATE_MESSAGE =
  "Data populates as Qoyl consumers search products — check back as your dashboard grows.";

const TIER_HEX: Record<"green" | "amber" | "red", string> = {
  green: "#5BA67A",
  amber: "#D4893A",
  red: "#D05555",
};

function RankedList({ items }: { items: { name: string; count: number }[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{EMPTY_STATE_MESSAGE}</p>;
  }

  const maxCount = Math.max(1, ...items.map((i) => i.count));

  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li
          key={item.name}
          className="rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
        >
          <div className="flex items-center justify-between">
            <span className="text-sand">
              <span className="text-muted mr-2">{i + 1}.</span>
              {item.name}
            </span>
            <span className="text-bronze2">{item.count}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-warm/[0.06]">
            <div
              className="h-full rounded-full bg-bronze"
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </li>
      ))}
    </ol>
  );
}

function PercentBarList({
  items,
  emptyMessage,
}: {
  items: { label: string; count: number; pct: number }[];
  emptyMessage?: string;
}) {
  if (items.length === 0) {
    return <p className="text-sm text-muted">{emptyMessage ?? EMPTY_STATE_MESSAGE}</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label} className="flex items-center gap-4">
          <span className="w-32 shrink-0 text-sm capitalize text-sand truncate">
            {item.label.replace(/_/g, " ")}
          </span>
          <div className="h-3 flex-1 overflow-hidden rounded-full bg-warm/[0.06]">
            <div
              className="h-full rounded-full bg-bronze"
              style={{ width: `${item.pct}%` }}
            />
          </div>
          <span className="w-16 shrink-0 text-right text-xs text-muted">
            {item.pct}% ({item.count})
          </span>
        </div>
      ))}
    </div>
  );
}

export default async function InsightsPage() {
  const [signals, hairProfiles, ingredientFlags, productRequests, styleMatchSignals] =
    await Promise.all([
      getConsumerDemandSignals(),
      getHairProfileBreakdown(),
      getIngredientFlagSignals(),
      getProductRequestSignals(),
      getStyleMatchSignals(),
    ]);

  const lastUpdated = new Date().toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const maxDailyCount = Math.max(1, ...signals.dailyVolume.map((d) => d.count));
  const maxWeeklyRequestCount = Math.max(1, ...productRequests.weeklyVolume.map((w) => w.count));
  const hasPorosityData = signals.avgScoreByPorosity.some((row) => row.count > 0);
  const hasVolumeData = signals.dailyVolume.some((d) => d.count > 0);

  const scoreTotal =
    signals.scoreDistribution.green + signals.scoreDistribution.amber + signals.scoreDistribution.red;
  const greenPct = scoreTotal > 0 ? (signals.scoreDistribution.green / scoreTotal) * 100 : 0;
  const amberPct = scoreTotal > 0 ? (signals.scoreDistribution.amber / scoreTotal) * 100 : 0;
  const donutBackground =
    scoreTotal > 0
      ? `conic-gradient(${TIER_HEX.green} 0% ${greenPct}%, ${TIER_HEX.amber} ${greenPct}% ${greenPct + amberPct}%, ${TIER_HEX.red} ${greenPct + amberPct}% 100%)`
      : "conic-gradient(rgba(237,229,216,0.08) 0% 100%)";

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-wider text-bronze2">
          Consumer Demand Signals
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-1">
          What consumers across all hair textures are searching for on Qoyl
        </h1>
        <p className="mt-3 text-xs text-muted">
          Last updated {lastUpdated} · Based on {signals.totalSearches.toLocaleString()}{" "}
          product search{signals.totalSearches === 1 ? "" : "es"} across all Qoyl users
        </p>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <section>
            <h2 className="font-serif text-xl text-cream mb-4">
              Most searched products
            </h2>
            <RankedList items={signals.topProducts} />
          </section>

          <section>
            <h2 className="font-serif text-xl text-cream mb-4">
              Most searched brands
            </h2>
            <RankedList items={signals.topBrands} />
          </section>
        </div>

        <section className="mt-12">
          <h2 className="font-serif text-xl text-cream mb-4">
            Average compatibility score by porosity
          </h2>
          {!hasPorosityData ? (
            <p className="text-sm text-muted">{EMPTY_STATE_MESSAGE}</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              {signals.avgScoreByPorosity.map((row) => (
                <div
                  key={row.porosity}
                  className="rounded-lg border border-warm/10 bg-warm/[0.03] p-6 text-center"
                >
                  <p className="text-xs uppercase tracking-wider text-muted">
                    {POROSITY_LABELS[row.porosity] ?? row.porosity}
                  </p>
                  <p
                    className={`mt-3 font-serif text-4xl ${
                      row.averageScore !== null
                        ? SCORE_TIER_TEXT_CLASSES[scoreTier(row.averageScore)]
                        : "text-muted"
                    }`}
                  >
                    {row.averageScore ?? "—"}
                  </p>
                  <p className="mt-2 text-xs text-muted">
                    {row.count} scored search{row.count === 1 ? "" : "es"}
                  </p>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="font-serif text-xl text-cream mb-4">
            Search volume over time
          </h2>
          <p className="mb-3 text-xs text-muted">Last 30 days</p>
          {!hasVolumeData ? (
            <p className="text-sm text-muted">{EMPTY_STATE_MESSAGE}</p>
          ) : (
            <div className="flex items-end gap-1 rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
              {signals.dailyVolume.map((d, i) => (
                <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
                  <div className="flex h-16 w-full items-end">
                    <div
                      className="w-full rounded-t bg-bronze2"
                      style={{
                        height: `${Math.max(4, (d.count / maxDailyCount) * 100)}%`,
                      }}
                    />
                  </div>
                  {/* Every 30 labels would overlap illegibly -- show every 5th. */}
                  <span className="text-[9px] text-muted whitespace-nowrap">
                    {i % 5 === 0
                      ? new Date(d.date).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })
                      : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Section 5 -- Hair profile breakdown */}
        <section className="mt-16 pt-10 border-t border-warm/10">
          <h2 className="font-serif text-2xl text-cream mb-1">
            Hair profile breakdown of Qoyl users
          </h2>
          <p className="mb-6 text-xs text-muted">
            {hairProfiles.totalProfiles.toLocaleString()} hair profile
            {hairProfiles.totalProfiles === 1 ? "" : "s"} on file
          </p>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Curl type</h3>
              <PercentBarList items={hairProfiles.byCurlType} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Porosity</h3>
              <PercentBarList items={hairProfiles.byPorosity} />
            </div>
          </div>

          <div className="mt-10 grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Scalp condition</h3>
              <PercentBarList items={hairProfiles.byScalpCondition} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Top zip codes</h3>
              <RankedList
                items={hairProfiles.topZipCodes.map((z) => ({ name: z.zip, count: z.count }))}
              />
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-serif text-lg text-bronze2 mb-3">Most common hair concerns</h3>
            <PercentBarList
              items={hairProfiles.topConcerns.map((c) => ({
                label: c.concern,
                count: c.count,
                pct:
                  hairProfiles.totalProfiles > 0
                    ? Math.round((c.count / hairProfiles.totalProfiles) * 100)
                    : 0,
              }))}
              emptyMessage="No hair profile data yet."
            />
          </div>
        </section>

        {/* Section 6 -- Ingredient flags */}
        <section className="mt-16 pt-10 border-t border-warm/10">
          <h2 className="font-serif text-2xl text-cream mb-1">
            Ingredient flags most commonly triggered
          </h2>
          <p className="mb-6 text-xs text-muted">
            Which ingredients the Qoyl community is most sensitive to, across all porosity levels.
          </p>
          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-lg text-red mb-3">Most flagged ingredients</h3>
              <RankedList items={ingredientFlags.mostFlagged} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-green mb-3">Most trusted ingredients</h3>
              <RankedList items={ingredientFlags.mostTrusted} />
            </div>
          </div>
        </section>

        {/* Section 7 -- Product evaluation requests */}
        <section className="mt-16 pt-10 border-t border-warm/10">
          <h2 className="font-serif text-2xl text-cream mb-1">
            Product evaluation requests
          </h2>
          <p className="mb-6 text-xs text-muted">
            {productRequests.totalRequests.toLocaleString()} total evaluation request
            {productRequests.totalRequests === 1 ? "" : "s"} submitted
          </p>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Most requested brands</h3>
              <RankedList items={productRequests.topBrands} />
            </div>
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">Most requested products</h3>
              <RankedList items={productRequests.topProducts} />
            </div>
          </div>

          <div className="mt-10">
            <h3 className="font-serif text-lg text-bronze2 mb-3">Request volume — last 8 weeks</h3>
            {productRequests.totalRequests === 0 ? (
              <p className="text-sm text-muted">{EMPTY_STATE_MESSAGE}</p>
            ) : (
              <div className="flex items-end gap-3 rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
                {productRequests.weeklyVolume.map((w) => (
                  <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-2">
                    <div className="flex h-16 w-full items-end">
                      <div
                        className="w-full rounded-t bg-bronze2"
                        style={{
                          height: `${Math.max(4, (w.count / maxWeeklyRequestCount) * 100)}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-muted whitespace-nowrap">
                      {new Date(w.weekStart).toLocaleDateString(undefined, {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* Section 8 -- Compatibility score distribution */}
        <section className="mt-16 pt-10 mb-8 border-t border-warm/10">
          <h2 className="font-serif text-2xl text-cream mb-6">
            Compatibility score distribution
          </h2>

          {scoreTotal === 0 ? (
            <p className="text-sm text-muted">{EMPTY_STATE_MESSAGE}</p>
          ) : (
            <div className="flex flex-wrap items-center gap-10">
              <div className="relative h-40 w-40 shrink-0 rounded-full" style={{ background: donutBackground }}>
                <div className="absolute inset-3 flex flex-col items-center justify-center rounded-full bg-dark">
                  <span className="font-serif text-2xl text-cream">{scoreTotal}</span>
                  <span className="text-[10px] uppercase tracking-wider text-muted">searches</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-green" />
                  <span className="text-sand">Green (70+)</span>
                  <span className="text-muted">
                    {signals.scoreDistribution.green} ({Math.round(greenPct)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber" />
                  <span className="text-sand">Amber (40–69)</span>
                  <span className="text-muted">
                    {signals.scoreDistribution.amber} ({Math.round(amberPct)}%)
                  </span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="h-2.5 w-2.5 rounded-full bg-red" />
                  <span className="text-sand">Red (under 40)</span>
                  <span className="text-muted">
                    {signals.scoreDistribution.red} (
                    {Math.round(100 - greenPct - amberPct)}%)
                  </span>
                </div>
              </div>
            </div>
          )}

          <p className="mt-6 text-xs text-muted max-w-md">
            Products scoring green for a user&apos;s profile have significantly higher
            purchase intent.
          </p>
        </section>

        {/* Section 9 -- Style Match signals */}
        <section className="mt-16 pt-10 mb-8 border-t border-warm/10">
          <h2 className="font-serif text-2xl text-cream mb-1">Style Match signals</h2>
          <p className="mb-6 text-xs text-muted">
            From {styleMatchSignals.totalMatches.toLocaleString()} Style Match
            {styleMatchSignals.totalMatches === 1 ? "" : "es"} —{" "}
            {styleMatchSignals.matchesWithKnownCity.toLocaleString()} with a known city.
            City coverage is limited today since most hair profiles aren&apos;t linked to
            an account yet.
          </p>

          <div className="grid gap-10 sm:grid-cols-2">
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">
                Most matched styles by city
              </h3>
              <RankedList
                items={styleMatchSignals.mostMatchedByCity.map((m) => ({
                  name: `${m.city} — ${m.style}`,
                  count: m.count,
                }))}
              />
            </div>
            <div>
              <h3 className="font-serif text-lg text-bronze2 mb-3">
                Fake hair demand by style and city
              </h3>
              <RankedList
                items={styleMatchSignals.fakeHairDemandByCity.map((m) => ({
                  name: `${m.city} — ${m.style}`,
                  count: m.count,
                }))}
              />
            </div>
          </div>

          <div className="mt-10 rounded-lg border border-bronze/30 bg-bronze/10 p-6">
            <p className="text-xs uppercase tracking-wider text-bronze2">
              Conversion rate — matched to followed through
            </p>
            <p className="mt-2 font-serif text-3xl text-cream">
              {styleMatchSignals.conversionRate.ratePct !== null
                ? `${styleMatchSignals.conversionRate.ratePct}%`
                : "—"}
            </p>
            <p className="mt-1 text-xs text-sand">
              {styleMatchSignals.conversionRate.followedThrough} of{" "}
              {styleMatchSignals.conversionRate.total} matches were followed through
              on.
            </p>
          </div>
        </section>
      </div>
    </div>
  );
}
