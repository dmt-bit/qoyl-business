import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveBrandAccess, type BrandApiAccount } from "@/lib/brandApiAuth";
import { fetchScoreReport, type ScoreReportResult } from "@/lib/scoreReportClient";

// Cached for an hour per brand. Route is dynamic (it reads the auth header), so
// the cache is applied inside via unstable_cache.
export const revalidate = 3600;

// Each product's score report runs six profiles through the scoring engine, so
// the dashboard shows at most this many products.
const MAX_PRODUCTS = 12;
const GEO_EVENT_TYPES = ["product_search", "search_profiled", "affiliate_click"];

type CityCount = { city: string; count: number };

async function cityCounts(productId: string): Promise<CityCount[]> {
  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data } = await getSupabaseAdmin()
    .from("ml_events")
    .select("metadata")
    .eq("metadata->>product_id", productId)
    .in("event_type", GEO_EVENT_TYPES)
    .gte("created_at", since);

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const city = ((row.metadata as { city?: string } | null)?.city ?? "").trim();
    if (!city || city === "unknown" || city === "null" || city === "undefined") continue;
    counts.set(city, (counts.get(city) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([city, count]) => ({ city, count }));
}

async function loadDashboard(account: BrandApiAccount) {
  const base = {
    brand: { id: account.id, name: account.company_name, brand_id: account.brand_id },
  };
  if (!account.brand_id) {
    return {
      ...base,
      brand_matched: false,
      products: [],
      message: "no products found in catalog for this brand",
    };
  }

  const admin = getSupabaseAdmin();
  const { data: rows, error } = await admin
    .from("catalog_products")
    .select("id, name, categories(name, slug), catalog_brands(name)")
    .eq("brand_id", account.brand_id)
    .order("name")
    .limit(MAX_PRODUCTS);
  if (error) throw new Error(`catalog_products lookup failed: ${error.message}`);

  const products = await Promise.all(
    (rows ?? []).map(async (row) => {
      const category = (row.categories as unknown as { name: string; slug: string } | null) ?? null;
      const brandName = (row.catalog_brands as unknown as { name: string } | null)?.name ?? account.company_name;

      let scoreReport: ScoreReportResult | null = null;
      try {
        scoreReport = await fetchScoreReport(row.name, brandName);
      } catch (err) {
        console.error("[brand dashboard] score report failed for", row.id, err);
      }

      return {
        id: row.id,
        name: row.name,
        category,
        score_report: scoreReport,
        geo: await cityCounts(row.id),
      };
    })
  );

  return { ...base, brand_matched: true, products };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = await resolveBrandAccess(request, url.searchParams.get("brandId"));
  if (!access.ok) {
    return NextResponse.json({ success: false, message: access.message }, { status: access.status });
  }

  try {
    const data = await unstable_cache(
      () => loadDashboard(access.account),
      ["brand-dashboard", access.account.id],
      { revalidate: 3600 }
    )();
    return NextResponse.json(data);
  } catch (err) {
    console.error("[brand dashboard] load failed:", err);
    return NextResponse.json({ success: false, message: "Could not load the dashboard." }, { status: 500 });
  }
}
