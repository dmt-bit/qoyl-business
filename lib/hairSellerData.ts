"use server";

import { getSupabaseAdmin } from "./supabaseAdmin";
import { verifyCallerEmail } from "./serverAuth";

export type ProductPerformance = {
  id: string;
  name: string;
  styleMatches: number;
  impressions: number;
  clicks: number;
  ctrPct: number | null;
  colorMatchRatePct: number | null;
  inStock: boolean;
};

export type HairSellerPerformance = {
  monthLabel: string;
  impressions: number;
  clicks: number;
  ctrPct: number | null;
  productCount: number;
  products: ProductPerformance[];
  colorBreakdown: { color: string; count: number }[];
  topStyles: { style: string; count: number }[];
};

type ImpressionRow = {
  fake_hair_product_id: string | null;
  style_match_id: string | null;
  impression_type: string;
  color_matched: boolean | null;
  matched_color: string | null;
};

const pct = (num: number, den: number) => (den > 0 ? Math.round((num / den) * 1000) / 10 : null);

// Everything is scoped to the current calendar month (UTC) so the header
// cards, table and breakdowns all describe the same window. The seller is
// resolved from the verified access token, not a client-supplied id.
export async function getHairSellerPerformance(
  accessToken: string
): Promise<HairSellerPerformance | null> {
  const email = await verifyCallerEmail(accessToken);
  if (!email) return null;

  const admin = getSupabaseAdmin();
  const { data: seller } = await admin
    .from("fake_hair_brand_accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();
  if (!seller) return null;

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [{ data: products }, { data: impressionData }] = await Promise.all([
    admin.from("fake_hair_products").select("id, product_name, in_stock").eq("brand_id", seller.id),
    admin
      .from("style_match_product_impressions")
      .select("fake_hair_product_id, style_match_id, impression_type, color_matched, matched_color")
      .eq("hair_seller_id", seller.id)
      .gte("created_at", monthStart.toISOString()),
  ]);

  const impressionsAll = (impressionData ?? []) as ImpressionRow[];
  const placements = impressionsAll.filter((r) => r.impression_type === "shopping_list_placement");
  const clickRows = impressionsAll.filter((r) => r.impression_type === "click_through");

  // Style names come from the style_matches rows the placements belong to.
  const matchIds = Array.from(
    new Set(placements.map((r) => r.style_match_id).filter((id): id is string => !!id))
  );
  const styleByMatchId = new Map<string, string>();
  for (let i = 0; i < matchIds.length; i += 200) {
    const { data } = await admin
      .from("style_matches")
      .select("id, detected_style")
      .in("id", matchIds.slice(i, i + 200));
    for (const m of data ?? []) if (m.detected_style) styleByMatchId.set(m.id, m.detected_style);
  }

  const perProduct = (products ?? []).map((p) => {
    const mine = placements.filter((r) => r.fake_hair_product_id === p.id);
    const clicks = clickRows.filter((r) => r.fake_hair_product_id === p.id).length;
    return {
      id: p.id,
      name: p.product_name,
      styleMatches: new Set(mine.map((r) => r.style_match_id).filter(Boolean)).size,
      impressions: mine.length,
      clicks,
      ctrPct: pct(clicks, mine.length),
      colorMatchRatePct: pct(mine.filter((r) => r.color_matched).length, mine.length),
      inStock: p.in_stock !== false,
    };
  });

  const tally = (keys: string[]) => {
    const counts = new Map<string, number>();
    for (const k of keys) counts.set(k, (counts.get(k) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1]);
  };

  return {
    monthLabel: monthStart.toLocaleString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }),
    impressions: placements.length,
    clicks: clickRows.length,
    ctrPct: pct(clickRows.length, placements.length),
    productCount: (products ?? []).length,
    products: perProduct.sort((a, b) => b.impressions - a.impressions),
    colorBreakdown: tally(
      placements.filter((r) => r.color_matched && r.matched_color).map((r) => r.matched_color as string)
    ).map(([color, count]) => ({ color, count })),
    topStyles: tally(
      placements
        .map((r) => (r.style_match_id ? styleByMatchId.get(r.style_match_id) : undefined))
        .filter((s): s is string => !!s)
    )
      .slice(0, 8)
      .map(([style, count]) => ({ style, count })),
  };
}
