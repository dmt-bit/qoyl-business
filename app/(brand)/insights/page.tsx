import {
  getConsumerDemandSignals,
  scoreTier,
  SCORE_TIER_TEXT_CLASSES,
} from "@/lib/brandData";

export const dynamic = "force-dynamic";

const POROSITY_LABELS: Record<string, string> = {
  low: "Low Porosity",
  medium: "Medium Porosity",
  high: "High Porosity",
};

const EMPTY_STATE_MESSAGE =
  "Data populates as Qoyl consumers search products — check back as your dashboard grows.";

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

export default async function InsightsPage() {
  const signals = await getConsumerDemandSignals();

  const maxConcernCount = Math.max(1, ...signals.topConcerns.map((c) => c.count));
  const maxDailyCount = Math.max(1, ...signals.dailyVolume.map((d) => d.count));
  const hasPorosityData = signals.avgScoreByPorosity.some((row) => row.count > 0);
  const hasVolumeData = signals.dailyVolume.some((d) => d.count > 0);

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
          Updated in real time · Based on {signals.totalSearches.toLocaleString()}{" "}
          product search{signals.totalSearches === 1 ? "" : "es"} across all Qoyl
          users
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

        <section className="mt-12 mb-8">
          <h2 className="font-serif text-xl text-cream mb-4">
            Top hair concerns
          </h2>
          {signals.topConcerns.length === 0 ? (
            <p className="text-sm text-muted">No hair profile data yet.</p>
          ) : (
            <div className="space-y-3">
              {signals.topConcerns.map((c) => (
                <div key={c.concern} className="flex items-center gap-4">
                  <span className="w-28 shrink-0 text-sm capitalize text-sand">
                    {c.concern}
                  </span>
                  <div className="h-3 flex-1 overflow-hidden rounded-full bg-warm/[0.06]">
                    <div
                      className="h-full rounded-full bg-bronze"
                      style={{ width: `${(c.count / maxConcernCount) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 shrink-0 text-right text-sm text-muted">
                    {c.count}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
