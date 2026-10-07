"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useFakeHairBrandSession } from "@/lib/fakeHairBrandSession";
import {
  getFakeHairBrandDashboardData,
  type FakeHairBrandDashboardData,
} from "@/lib/fakeHairBrandData";
import { supabase } from "@/lib/supabase";
import type { HairSellerStats } from "@/app/api/business/hair-seller/stats/route";

// Design note: same as the stylist dashboard - this spec was written in
// Qoyl's consumer-app palette. Layout/copy/behavior below match the spec;
// colors and type use this app's existing dark theme (warm/bronze/cream),
// same as every other brand/stylist/hair-seller page.

const norm = (s: string) => s.toLowerCase().trim().replace(/[\s-]+/g, "_");

function productMatchesStyle(product: { compatibleStyles: string[] }, style: { name: string; slug: string }): boolean {
  const normed = product.compatibleStyles.map(norm);
  if (normed.includes("all_styles")) return true;
  return normed.includes(norm(style.slug)) || normed.includes(norm(style.name));
}

type StyleRow = { id: string; name: string; slug: string; requires_fake_hair: boolean };

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-4">
      <p className="font-mono text-[28px] font-bold leading-none text-cream">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs uppercase tracking-wider text-bronze2">{children}</p>;
}

const CHECKLIST_ITEMS = [
  "All colorways listed",
  "Pack counts by length included",
  "Product names include color code",
  "Lengths available listed per color",
];

export default function FakeHairBrandDashboardPage() {
  const { loading: sessionLoading, session, account } = useFakeHairBrandSession();
  const [data, setData] = useState<FakeHairBrandDashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);
  const [stats, setStats] = useState<HairSellerStats | null>(null);
  const [topStyles, setTopStyles] = useState<StyleRow[]>([]);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    getFakeHairBrandDashboardData(session.access_token).then((result) => {
      if (!cancelled) {
        setData(result);
        setDataLoading(false);
      }
    });

    fetch("/api/business/hair-seller/stats", {
      headers: { authorization: `Bearer ${session.access_token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((result) => {
        if (!cancelled && result) setStats(result);
      })
      .catch(() => {});

    supabase
      .from("styles")
      .select("id, name, slug, requires_fake_hair")
      .eq("requires_fake_hair", true)
      .order("name", { ascending: true })
      .limit(5)
      .then(({ data: styles }) => {
        if (!cancelled && styles) setTopStyles(styles as StyleRow[]);
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

  const products = data?.products ?? [];

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="font-serif text-3xl sm:text-4xl text-cream">{account.company_name}</h1>
          <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-[11px] uppercase tracking-wider text-dark">
            hair seller · $35/month
          </span>
        </div>

        {/* Section 1 - placement stats */}
        <div className="mt-10">
          <SectionLabel>placement stats</SectionLabel>
          {!stats ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="shopping list appearances (30d)" value={stats.shoppingListAppearances30d} />
              <StatCard label="top style driving placements" value={stats.topStyleDrivingPlacements ?? "-"} />
              <StatCard label="catalog products" value={stats.catalogProductCount} />
              <StatCard label="colors matched" value={stats.colorMatchCount} />
            </div>
          )}
        </div>

        {/* Section 2 - your catalog */}
        <div className="mt-10">
          <SectionLabel>your catalog</SectionLabel>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-warm/10 bg-warm/[0.03] px-8 py-16 text-center">
              <p className="font-serif text-xl text-sand">
                your catalog is empty - add products to start appearing in style match shopping lists
              </p>
              <Link
                href="/fake-hair-brand/products/add"
                className="mt-4 inline-block rounded-full bg-bronze px-6 py-3 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
              >
                add products →
              </Link>
            </div>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-warm/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3">Colors</th>
                    <th className="px-4 py-3">Lengths</th>
                    <th className="px-4 py-3">Pack count</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p) => {
                    const lengths = Object.keys(p.packsNeededByLength ?? {});
                    return (
                      <tr key={p.id} className="border-t border-warm/10">
                        <td className="px-4 py-3 text-cream">{p.productName}</td>
                        <td className="px-4 py-3 text-sand">
                          {p.availableColors.length > 0 ? p.availableColors.join(", ") : "—"}
                        </td>
                        <td className="px-4 py-3 text-sand">{lengths.length > 0 ? lengths.join(", ") : "—"}</td>
                        <td className="px-4 py-3 text-muted">
                          {lengths.length > 0 ? Object.values(p.packsNeededByLength ?? {}).join(" / ") : "—"}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide ${
                              p.inStock ? "bg-green/15 text-green" : "bg-red/15 text-red"
                            }`}
                          >
                            {p.inStock ? "in stock" : "out of stock"}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Section 3 - color matching */}
        <div className="mt-10">
          <SectionLabel>how color matching works</SectionLabel>
          <div className="rounded-lg border border-warm/15 bg-warm/[0.03] p-5">
            <p className="text-sm text-sand">
              when a qoyl user uploads a selfie, we detect their natural hair color. when their style match requires
              fake hair, your catalog products are matched to their detected color and surfaced in the shopping list.
            </p>
            <p className="mt-3 text-sm text-sand">the more complete your color catalog, the more matches you get.</p>
            <ul className="mt-4 space-y-1.5">
              {CHECKLIST_ITEMS.map((item) => (
                <li key={item} className="flex items-center gap-2 text-xs text-muted">
                  <span className="inline-block h-3.5 w-3.5 shrink-0 rounded-sm border border-warm/30" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Section 4 - top matched styles */}
        <div className="mt-10 mb-8">
          <SectionLabel>styles your products appear in</SectionLabel>
          {topStyles.length === 0 ? (
            <p className="text-sm text-muted">No styles requiring fake hair found yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {topStyles.map((style) => {
                const matched = products.some((p) => productMatchesStyle(p, style));
                return (
                  <span
                    key={style.id}
                    className={`rounded-full px-3 py-1.5 text-[11px] ${
                      matched ? "bg-green/15 text-green" : "border border-warm/20 text-muted"
                    }`}
                  >
                    {matched
                      ? `${style.name.toLowerCase()} · catalog matched`
                      : `add a product for ${style.name.toLowerCase()}`}
                  </span>
                );
              })}
            </div>
          )}
        </div>

        {/* Existing section, kept: city-level demand across the seller's styles. */}
        {data && data.cityDemand.length > 0 && (
          <section className="mt-10 mb-8">
            <h2 className="font-serif text-xl text-cream mb-1">Cities with highest demand for your styles</h2>
            <p className="mb-4 text-xs text-muted">
              Based on Style Match activity where a city could be determined — coverage is currently limited.
            </p>
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
          </section>
        )}
      </div>
    </div>
  );
}
