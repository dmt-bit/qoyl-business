"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useBrandSession } from "@/lib/brandSession";

const TIER_LABELS: Record<string, string> = {
  early_stage: "Early Stage",
  growth: "Growth",
  enterprise: "Enterprise",
};

type Product = {
  id: string;
  product_name: string;
  category: string | null;
};

export default function DashboardPage() {
  const { loading: sessionLoading, account } = useBrandSession();
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    if (!account) return;
    let cancelled = false;

    supabase
      .from("brand_products")
      .select("id, product_name, category")
      .eq("brand_id", account.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        if (!cancelled) setProducts(data ?? []);
      });

    return () => {
      cancelled = true;
    };
  }, [account]);

  if (sessionLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap items-center justify-between gap-4 mb-2">
          <h1 className="font-serif text-3xl sm:text-4xl text-cream">
            Welcome, {account.company_name}
          </h1>
          <Link
            href="/products/add"
            className="rounded-full bg-bronze px-6 py-3 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
          >
            + Add a product
          </Link>
        </div>

        <span className="inline-block rounded-full border border-bronze/40 bg-bronze/10 px-3 py-1 text-xs uppercase tracking-wider text-bronze2">
          {TIER_LABELS[account.tier] ?? account.tier}
        </span>

        <div className="mt-10">
          {products === null ? (
            <p className="text-muted">Loading products...</p>
          ) : products.length === 0 ? (
            <div className="rounded-lg border border-warm/10 bg-warm/[0.03] px-8 py-16 text-center">
              <p className="font-serif text-xl text-sand">
                Add your first product to see how it scores with type 4 hair
                consumers{" "}
                <Link href="/products/add" className="text-bronze2 hover:text-bronze">
                  →
                </Link>
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <div
                  key={product.id}
                  className="rounded-lg border border-warm/10 bg-warm/[0.03] p-6"
                >
                  <h2 className="font-serif text-lg text-cream">
                    {product.product_name}
                  </h2>
                  <p className="mt-1 text-xs uppercase tracking-wider text-muted">
                    {product.category ?? "Uncategorized"}
                  </p>
                  <Link
                    href={`/products/${product.id}`}
                    className="mt-4 inline-block text-sm text-bronze2 hover:text-bronze transition-colors"
                  >
                    View analysis →
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
