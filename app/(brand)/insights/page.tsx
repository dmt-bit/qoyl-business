import { getConsumerDemandSignals } from "@/lib/brandData";

export const dynamic = "force-dynamic";

export default async function InsightsPage() {
  const signals = await getConsumerDemandSignals();

  const maxConcernCount = Math.max(1, ...signals.topConcerns.map((c) => c.count));
  const maxWeeklyCount = Math.max(1, ...signals.weeklyVolume.map((w) => w.count));

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        <p className="text-xs uppercase tracking-wider text-bronze2">
          Consumer Demand Signals
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-1">
          What type 4 hair consumers are searching for on Qoyl
        </h1>

        <div className="mt-12 grid gap-10 sm:grid-cols-2">
          <section>
            <h2 className="font-serif text-xl text-cream mb-4">
              Top requested products
            </h2>
            {signals.topProducts.length === 0 ? (
              <p className="text-sm text-muted">No requests yet.</p>
            ) : (
              <ol className="space-y-2">
                {signals.topProducts.map((p, i) => (
                  <li
                    key={p.name}
                    className="flex items-center justify-between rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                  >
                    <span className="text-sand">
                      <span className="text-muted mr-2">{i + 1}.</span>
                      {p.name}
                    </span>
                    <span className="text-bronze2">{p.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>

          <section>
            <h2 className="font-serif text-xl text-cream mb-4">
              Top requested brands
            </h2>
            {signals.topBrands.length === 0 ? (
              <p className="text-sm text-muted">No requests yet.</p>
            ) : (
              <ol className="space-y-2">
                {signals.topBrands.map((b, i) => (
                  <li
                    key={b.name}
                    className="flex items-center justify-between rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                  >
                    <span className="text-sand">
                      <span className="text-muted mr-2">{i + 1}.</span>
                      {b.name}
                    </span>
                    <span className="text-bronze2">{b.count}</span>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>

        <section className="mt-12">
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

        <section className="mt-12">
          <h2 className="font-serif text-xl text-cream mb-4">
            Weekly request volume
          </h2>
          <div className="flex items-end gap-2 rounded-lg border border-warm/10 bg-warm/[0.03] p-6">
            {signals.weeklyVolume.map((w) => (
              <div key={w.weekStart} className="flex flex-1 flex-col items-center gap-2">
                <div className="flex h-16 w-full items-end">
                  <div
                    className="w-full rounded-t bg-bronze2"
                    style={{
                      height: `${Math.max(4, (w.count / maxWeeklyCount) * 100)}%`,
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
        </section>

        <p className="mt-12 mb-4 text-xs text-muted">
          Data updates in real time as Qoyl consumers search and request
          products.
        </p>
      </div>
    </div>
  );
}
