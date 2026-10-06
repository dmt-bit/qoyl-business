import { getSupabaseAdmin } from "./supabaseAdmin";
import { fetchScoreReport, type ScoreReportResult } from "./scoreReportClient";

// Everything a report prompt is allowed to use. Built only from database rows
// and scoring output; nothing here is estimated.

export type OkReport = Extract<ScoreReportResult, { status: "ok" }>;

export type ReportProductInput = {
  id: string;
  name: string;
  category: string | null;
  report: OkReport | null;
  competitors: { name: string; brand: string; averageScore: number }[];
};

export type ReportInputs = {
  brandName: string;
  products: ReportProductInput[];
  topSearchedProducts: { name: string; brand: string; searches: number }[];
  searchWindowDays: number;
};

const MAX_PRODUCTS = 3;
const MAX_COMPETITORS = 5;
const SEARCH_WINDOW_DAYS = 30;

export async function gatherReportInputs(brand: { brand_id: string | null; company_name: string }, focusProductId: string | null): Promise<ReportInputs> {
  const admin = getSupabaseAdmin();
  const empty: ReportInputs = {
    brandName: brand.company_name,
    products: [],
    topSearchedProducts: [],
    searchWindowDays: SEARCH_WINDOW_DAYS,
  };
  if (!brand.brand_id) return empty;

  const productQuery = admin
    .from("catalog_products")
    .select("id, name, category_id, categories(name), catalog_brands(name)")
    .eq("brand_id", brand.brand_id)
    .order("name");
  const { data: ownRows, error } = await (focusProductId ? productQuery.eq("id", focusProductId) : productQuery).limit(MAX_PRODUCTS);
  if (error) throw new Error(`catalog_products lookup failed: ${error.message}`);

  const products: ReportProductInput[] = [];
  for (const row of ownRows ?? []) {
    const category = (row.categories as unknown as { name: string } | null)?.name ?? null;
    const brandName = (row.catalog_brands as unknown as { name: string } | null)?.name ?? brand.company_name;
    const own = await fetchScoreReport(row.name, brandName);
    const report = own?.status === "ok" ? own : null;

    // Same-category products to compare against, scored the same way.
    const { data: peers } = await admin
      .from("catalog_products")
      .select("name, catalog_brands(name)")
      .eq("category_id", row.category_id)
      .neq("id", row.id)
      .limit(MAX_COMPETITORS);
    const competitors: ReportProductInput["competitors"] = [];
    for (const peer of peers ?? []) {
      const peerBrand = (peer.catalog_brands as unknown as { name: string } | null)?.name ?? "";
      const peerReport = await fetchScoreReport(peer.name, peerBrand || null);
      if (peerReport?.status === "ok") {
        competitors.push({ name: peer.name, brand: peerBrand, averageScore: peerReport.averageScore });
      }
    }

    products.push({ id: row.id, name: row.name, category, report, competitors });
  }

  // Search counts for the trend report. Only what product_searches recorded.
  const since = new Date(Date.now() - SEARCH_WINDOW_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: searches } = await admin
    .from("product_searches")
    .select("product_name, brand_name")
    .gte("created_at", since)
    .limit(5000);
  const counts = new Map<string, { name: string; brand: string; searches: number }>();
  for (const s of searches ?? []) {
    const key = `${s.brand_name ?? ""}|${s.product_name ?? ""}`;
    const entry = counts.get(key) ?? { name: s.product_name ?? "", brand: s.brand_name ?? "", searches: 0 };
    entry.searches += 1;
    counts.set(key, entry);
  }
  const topSearchedProducts = Array.from(counts.values())
    .sort((a, b) => b.searches - a.searches)
    .slice(0, 10);

  return { brandName: brand.company_name, products, topSearchedProducts, searchWindowDays: SEARCH_WINDOW_DAYS };
}
