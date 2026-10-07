import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCallerEmail } from "@/lib/serverAuth";

export type HairSellerStats = {
  shoppingListAppearances30d: number;
  topStyleDrivingPlacements: string | null;
  catalogProductCount: number;
  colorMatchCount: number;
};

// Placement stats for the authenticated hair seller. Reads
// style_match_product_impressions - the row that's actually written when a
// seller's product is surfaced in a shopping list (see qoyl-beta's
// app/api/style-match/fake-hair-products/route.ts) - not ml_events, which
// has no per-product/per-seller placement data.
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  const email = await verifyCallerEmail(token);
  if (!email) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: seller } = await admin
    .from("fake_hair_brand_accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!seller) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const [{ data: recentImpressions }, { count: catalogProductCount }, { data: colorMatches }] =
    await Promise.all([
      admin
        .from("style_match_product_impressions")
        .select("style_match_id, color_matched, matched_color")
        .eq("hair_seller_id", seller.id)
        .gte("created_at", since30d),
      admin.from("fake_hair_products").select("id", { count: "exact", head: true }).eq("brand_id", seller.id),
      admin
        .from("style_match_product_impressions")
        .select("matched_color")
        .eq("hair_seller_id", seller.id)
        .eq("color_matched", true),
    ]);

  const impressions = recentImpressions ?? [];

  // Which style drove the most placements this window - one extra lookup
  // against style_matches since impressions only store the match id.
  let topStyleDrivingPlacements: string | null = null;
  const matchIds = Array.from(new Set(impressions.map((i) => i.style_match_id).filter((id): id is string => Boolean(id))));
  if (matchIds.length > 0) {
    const { data: matches } = await admin.from("style_matches").select("id, detected_style").in("id", matchIds);
    const styleById = new Map((matches ?? []).map((m) => [m.id, m.detected_style]));
    const counts = new Map<string, number>();
    for (const imp of impressions) {
      const style = imp.style_match_id ? styleById.get(imp.style_match_id) : null;
      if (style) counts.set(style, (counts.get(style) ?? 0) + 1);
    }
    const top = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0];
    topStyleDrivingPlacements = top?.[0] ?? null;
  }

  const colorMatchCount = new Set((colorMatches ?? []).map((c) => c.matched_color).filter(Boolean)).size;

  const stats: HairSellerStats = {
    shoppingListAppearances30d: impressions.length,
    topStyleDrivingPlacements,
    catalogProductCount: catalogProductCount ?? 0,
    colorMatchCount,
  };

  return NextResponse.json(stats);
}
