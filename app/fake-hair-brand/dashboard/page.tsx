"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFakeHairBrandSession } from "@/lib/fakeHairBrandSession";
import {
  getFakeHairBrandDashboardData,
  type FakeHairBrandDashboardData,
} from "@/lib/fakeHairBrandData";

export default function FakeHairBrandDashboardPage() {
  const { loading: sessionLoading, session, account } = useFakeHairBrandSession();
  const [data, setData] = useState<FakeHairBrandDashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    getFakeHairBrandDashboardData(session.access_token).then((result) => {
      if (!cancelled) {
        setData(result);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (sessionLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-cream">
            Welcome, {account.company_name}
          </h1>
          <Link
            href="/fake-hair-brand/products/add"
            className="rounded-full bg-bronze px-6 py-3 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
          >
            + Add a product
          </Link>
        </div>

        <section className="mt-10">
          <h2 className="font-serif text-xl text-cream mb-1">Which styles feature your products</h2>
          <p className="mb-4 text-xs text-muted">
            Click-through data is awaiting Style Match integration — counts below
            are real, but will read 0 until that consumer-facing wiring ships.
          </p>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : !data || data.products.length === 0 ? (
            <div className="rounded-lg border border-warm/10 bg-warm/[0.03] px-8 py-16 text-center">
              <p className="font-serif text-xl text-sand">
                Add your first product to see which styles feature it{" "}
                <Link href="/fake-hair-brand/products/add" className="text-bronze2 hover:text-bronze">
                  →
                </Link>
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-warm/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Style</th>
                    <th className="px-4 py-3">Clicks</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((p) => (
                    <tr key={p.id} className="border-t border-warm/10">
                      <td className="px-4 py-3 text-cream">{p.productName}</td>
                      <td className="px-4 py-3 text-sand">{p.styleName ?? "—"}</td>
                      <td className="px-4 py-3 text-muted">{p.clickCount}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        <section className="mt-10 mb-8">
          <h2 className="font-serif text-xl text-cream mb-1">
            Cities with highest demand for your styles
          </h2>
          <p className="mb-4 text-xs text-muted">
            Based on Style Match activity where a city could be determined —
            coverage is currently limited (most profiles don&apos;t have a linked
            city yet).
          </p>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : !data || data.cityDemand.length === 0 ? (
            <p className="text-sm text-muted">
              No city-level demand data yet for your styles.
            </p>
          ) : (
            <ol className="space-y-2">
              {data.cityDemand.map((c, i) => (
                <li
                  key={c.city}
                  className="flex items-center justify-between rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                >
                  <span className="text-sand">
                    <span className="text-muted mr-2">{i + 1}.</span>
                    {c.city}
                  </span>
                  <span className="text-bronze2">{c.count}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </div>
  );
}
