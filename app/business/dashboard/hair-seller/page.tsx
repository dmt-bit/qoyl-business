"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFakeHairBrandSession } from "@/lib/fakeHairBrandSession";
import { getHairSellerPerformance, type HairSellerPerformance } from "@/lib/hairSellerData";

const EMPTY = "No data yet — placements appear as shoppers' Style Match lists surface your products.";

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-5">
      <p className="text-xs uppercase tracking-wider text-muted">{label}</p>
      <p className="mt-2 font-serif text-3xl text-cream">{value}</p>
    </div>
  );
}

function BarList({ items }: { items: { label: string; count: number }[] }) {
  if (items.length === 0) return <p className="text-sm text-muted">{EMPTY}</p>;
  const max = Math.max(1, ...items.map((i) => i.count));
  return (
    <ol className="space-y-2">
      {items.map((i) => (
        <li key={i.label} className="rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-sand">{i.label}</span>
            <span className="text-bronze2">{i.count}</span>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-warm/[0.06]">
            <div className="h-full rounded-full bg-bronze" style={{ width: `${(i.count / max) * 100}%` }} />
          </div>
        </li>
      ))}
    </ol>
  );
}

const fmtPct = (v: number | null) => (v === null ? "—" : `${v}%`);

export default function HairSellerDashboardPage() {
  const { loading, session, account } = useFakeHairBrandSession();
  const [data, setData] = useState<HairSellerPerformance | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;
    getHairSellerPerformance(session.access_token).then((r) => {
      if (!cancelled) {
        setData(r);
        setDataLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session]);

  if (loading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-5xl">
        <p className="text-xs uppercase tracking-wider text-bronze2">Hair seller performance</p>
        <h1 className="mt-1 font-serif text-3xl sm:text-4xl text-cream">{account.company_name}</h1>
        <p className="mt-2 text-xs text-muted">
          {data ? data.monthLabel : "This month"} ·{" "}
          <Link href="/fake-hair-brand/dashboard" className="text-bronze2 hover:text-bronze">
            Catalog &amp; city demand →
          </Link>
        </p>

        {dataLoading ? (
          <p className="mt-10 text-muted">Loading...</p>
        ) : !data ? (
          <p className="mt-10 text-muted">Couldn&apos;t load performance data.</p>
        ) : (
          <>
            <section className="mt-10 grid gap-4 sm:grid-cols-4">
              <Stat label="Impressions" value={data.impressions.toLocaleString()} />
              <Stat label="Click-throughs" value={data.clicks.toLocaleString()} />
              <Stat label="Click-through rate" value={fmtPct(data.ctrPct)} />
              <Stat label="Products in catalog" value={data.productCount.toLocaleString()} />
            </section>

            <section className="mt-12">
              <h2 className="mb-4 font-serif text-xl text-cream">Product performance</h2>
              {data.products.length === 0 ? (
                <p className="text-sm text-muted">
                  No products yet — upload your catalog via the catalog endpoint to start being matched.
                </p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-warm/10">
                  <table className="min-w-full text-left text-sm">
                    <thead className="bg-warm/[0.04] text-xs uppercase tracking-wider text-muted">
                      <tr>
                        <th className="px-4 py-3">Product</th>
                        <th className="px-4 py-3">Style matches</th>
                        <th className="px-4 py-3">Impressions</th>
                        <th className="px-4 py-3">Clicks</th>
                        <th className="px-4 py-3">CTR</th>
                        <th className="px-4 py-3">Color match rate</th>
                        <th className="px-4 py-3">Stock</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.products.map((p) => (
                        <tr key={p.id} className="border-t border-warm/10">
                          <td className="px-4 py-3 text-cream">{p.name}</td>
                          <td className="px-4 py-3 text-sand">{p.styleMatches}</td>
                          <td className="px-4 py-3 text-sand">{p.impressions}</td>
                          <td className="px-4 py-3 text-sand">{p.clicks}</td>
                          <td className="px-4 py-3 text-sand">{fmtPct(p.ctrPct)}</td>
                          <td className="px-4 py-3 text-sand">{fmtPct(p.colorMatchRatePct)}</td>
                          <td className={`px-4 py-3 ${p.inStock ? "text-green" : "text-red"}`}>
                            {p.inStock ? "In stock" : "Out of stock"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>

            <div className="mt-12 mb-8 grid gap-10 sm:grid-cols-2">
              <section>
                <h2 className="font-serif text-xl text-cream mb-1">Color match breakdown</h2>
                <p className="mb-4 text-xs text-muted">Colorways matching shoppers most often — stock these deeper.</p>
                <BarList items={data.colorBreakdown.map((c) => ({ label: c.color, count: c.count }))} />
              </section>
              <section>
                <h2 className="font-serif text-xl text-cream mb-1">Top styles</h2>
                <p className="mb-4 text-xs text-muted">Style matches surfacing your products most.</p>
                <BarList items={data.topStyles.map((s) => ({ label: s.style, count: s.count }))} />
              </section>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
