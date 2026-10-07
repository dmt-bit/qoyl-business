"use server";

import { getSupabaseAdmin } from "./supabaseAdmin";
import { verifyCallerEmail } from "./serverAuth";
import { getCityDemandForStyles } from "./styleSignals";

export type FakeHairProductWithStyle = {
  id: string;
  productName: string;
  productUrl: string | null;
  styleName: string | null;
  clickCount: number;
  // Catalog table columns (dashboard Section 2) and the real field the
  // matcher uses (lib/fakeHairMatcher.ts in qoyl-beta) - styleName above
  // comes from a styles(name) FK join that isn't what matching actually
  // runs on; compatibleStyles (free text the seller typed) is.
  availableColors: string[];
  packsNeededByLength: Record<string, number> | null;
  inStock: boolean;
  compatibleStyles: string[];
};

export type FakeHairBrandDashboardData = {
  products: FakeHairProductWithStyle[];
  cityDemand: { city: string; count: number }[];
};

type ProductRow = {
  id: string;
  product_name: string;
  product_url: string | null;
  styles: { name: string } | null;
  available_colors: string[] | null;
  packs_needed_by_length: Record<string, number> | null;
  in_stock: boolean | null;
  compatible_styles: string[] | null;
};

// accessToken is verified server-side rather than trusting a client-
// supplied brand id -- see lib/serverAuth.ts.
export async function getFakeHairBrandDashboardData(
  accessToken: string
): Promise<FakeHairBrandDashboardData | null> {
  const email = await verifyCallerEmail(accessToken);
  if (!email) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data: brand } = await supabaseAdmin
    .from("fake_hair_brand_accounts")
    .select("id")
    .eq("email", email)
    .single();

  if (!brand) return null;

  const { data: products } = await supabaseAdmin
    .from("fake_hair_products")
    .select(
      "id, product_name, product_url, styles(name), available_colors, packs_needed_by_length, in_stock, compatible_styles"
    )
    .eq("brand_id", brand.id)
    .order("created_at", { ascending: false });

  const rows = (products ?? []) as unknown as ProductRow[];
  const productIds = rows.map((p) => p.id);

  const { data: clicks } =
    productIds.length > 0
      ? await supabaseAdmin
          .from("fake_hair_product_clicks")
          .select("product_id")
          .in("product_id", productIds)
      : { data: [] as { product_id: string }[] };

  const clickCounts = new Map<string, number>();
  for (const c of clicks ?? []) {
    clickCounts.set(c.product_id, (clickCounts.get(c.product_id) ?? 0) + 1);
  }

  const styleNames = Array.from(new Set(rows.map((p) => p.styles?.name).filter((n): n is string => !!n)));
  const cityDemand = await getCityDemandForStyles(styleNames);

  return {
    products: rows.map((p) => ({
      id: p.id,
      productName: p.product_name,
      productUrl: p.product_url,
      styleName: p.styles?.name ?? null,
      clickCount: clickCounts.get(p.id) ?? 0,
      availableColors: p.available_colors ?? [],
      packsNeededByLength: p.packs_needed_by_length ?? null,
      inStock: p.in_stock !== false,
      compatibleStyles: p.compatible_styles ?? [],
    })),
    cityDemand,
  };
}
