import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { verifyCallerEmail } from "@/lib/serverAuth";
import {
  CATALOG_HAIR_TYPES,
  HAIR_PREFERENCES,
  LENGTH_KEYS,
  isStringArray,
} from "@/lib/hairSeller";

const MAX_PRODUCTS = 200;

type Row = {
  brand_id: string;
  product_name: string;
  hair_type: string;
  compatible_styles: string[];
  blends_with_curl_types: string[];
  available_colors: string[];
  price_per_pack_usd: number;
  packs_needed_by_length: Record<string, number>;
  can_be_heat_styled: boolean;
  hair_preference: string;
  product_url: string;
  amazon_asin: string | null;
  in_stock: boolean;
  shed_rating: number | null;
  updated_at: string;
};

// Returns the row or a list of problems for that item.
function parseProduct(raw: unknown, brandId: string): { row?: Row; errors: string[] } {
  const errors: string[] = [];
  if (typeof raw !== "object" || raw === null) return { errors: ["not an object"] };
  const p = raw as Record<string, unknown>;

  if (typeof p.product_name !== "string" || !p.product_name.trim()) errors.push("product_name is required");
  if (typeof p.hair_type !== "string" || !(CATALOG_HAIR_TYPES as readonly string[]).includes(p.hair_type))
    errors.push(`hair_type must be one of ${CATALOG_HAIR_TYPES.join(" | ")}`);
  if (!isStringArray(p.compatible_styles)) errors.push("compatible_styles must be string[]");
  if (!isStringArray(p.blends_with_curl_types)) errors.push("blends_with_curl_types must be string[]");
  if (!isStringArray(p.available_colors)) errors.push("available_colors must be string[]");
  if (typeof p.price_per_pack_usd !== "number" || !(p.price_per_pack_usd >= 0))
    errors.push("price_per_pack_usd must be a non-negative number");
  const packs = p.packs_needed_by_length as Record<string, unknown> | null;
  if (
    typeof packs !== "object" || packs === null ||
    LENGTH_KEYS.some((k) => typeof packs[k] !== "number")
  )
    errors.push(`packs_needed_by_length needs numeric ${LENGTH_KEYS.join(", ")}`);
  if (typeof p.can_be_heat_styled !== "boolean") errors.push("can_be_heat_styled must be boolean");
  if (typeof p.hair_preference !== "string" || !(HAIR_PREFERENCES as readonly string[]).includes(p.hair_preference))
    errors.push(`hair_preference must be one of ${HAIR_PREFERENCES.join(" | ")}`);
  if (typeof p.product_url !== "string" || !p.product_url.trim()) errors.push("product_url is required");
  if (p.amazon_asin != null && typeof p.amazon_asin !== "string") errors.push("amazon_asin must be string or null");
  if (typeof p.in_stock !== "boolean") errors.push("in_stock must be boolean");
  // Optional -- not in the original upload shape, but the matcher's final
  // tiebreak (lower shed is better) needs somewhere to come from.
  if (p.shed_rating != null && (typeof p.shed_rating !== "number" || p.shed_rating < 1 || p.shed_rating > 5))
    errors.push("shed_rating must be a number 1-5 when provided");

  if (errors.length > 0) return { errors };

  return {
    errors,
    row: {
      brand_id: brandId,
      product_name: (p.product_name as string).trim(),
      hair_type: p.hair_type as string,
      compatible_styles: p.compatible_styles as string[],
      blends_with_curl_types: p.blends_with_curl_types as string[],
      available_colors: p.available_colors as string[],
      price_per_pack_usd: p.price_per_pack_usd as number,
      packs_needed_by_length: packs as Record<string, number>,
      can_be_heat_styled: p.can_be_heat_styled as boolean,
      hair_preference: p.hair_preference as string,
      product_url: (p.product_url as string).trim(),
      amazon_asin: (p.amazon_asin as string | null) ?? null,
      in_stock: p.in_stock as boolean,
      shed_rating: (p.shed_rating as number | null | undefined) ?? null,
      updated_at: new Date().toISOString(),
    },
  };
}

// Authenticated seller upload. Send the seller's Supabase access token as
// `Authorization: Bearer <token>`; the seller is resolved from the verified
// token's email, never from a client-supplied id.
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? null;
  const email = await verifyCallerEmail(token);
  if (!email) {
    return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const { data: seller } = await admin
    .from("fake_hair_brand_accounts")
    .select("id, status")
    .eq("email", email)
    .maybeSingle();

  if (!seller || !["approved", "active"].includes(seller.status)) {
    return NextResponse.json({ error: "No active hair seller account for this login." }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  if (!Array.isArray(body) || body.length === 0 || body.length > MAX_PRODUCTS) {
    return NextResponse.json(
      { error: `Body must be an array of 1-${MAX_PRODUCTS} products.` },
      { status: 400 }
    );
  }

  // Validate everything first so a bad row 40 doesn't leave a half-applied
  // upload.
  const rows: Row[] = [];
  const problems: { index: number; errors: string[] }[] = [];
  body.forEach((raw, index) => {
    const { row, errors } = parseProduct(raw, seller.id);
    if (row) rows.push(row);
    else problems.push({ index, errors });
  });
  if (problems.length > 0) {
    return NextResponse.json({ error: "Validation failed.", problems }, { status: 400 });
  }

  const { data: existing, error: existingError } = await admin
    .from("fake_hair_products")
    .select("id, product_name")
    .eq("brand_id", seller.id);
  if (existingError) {
    console.error("[hair-seller/catalog] existing lookup failed:", existingError);
    return NextResponse.json({ error: "Could not read your catalog." }, { status: 500 });
  }
  const idByName = new Map((existing ?? []).map((e) => [e.product_name, e.id as string]));

  let added = 0;
  let updated = 0;
  for (const row of rows) {
    const existingId = idByName.get(row.product_name);
    if (existingId) {
      const { error } = await admin.from("fake_hair_products").update(row).eq("id", existingId);
      if (error) {
        console.error("[hair-seller/catalog] update failed:", row.product_name, error);
        return NextResponse.json({ error: `Failed updating "${row.product_name}".`, added, updated }, { status: 500 });
      }
      updated += 1;
    } else {
      const { error } = await admin.from("fake_hair_products").insert(row);
      if (error) {
        console.error("[hair-seller/catalog] insert failed:", row.product_name, error);
        return NextResponse.json({ error: `Failed adding "${row.product_name}".`, added, updated }, { status: 500 });
      }
      added += 1;
    }
  }

  return NextResponse.json({ added, updated });
}
