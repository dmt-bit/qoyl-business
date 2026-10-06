import { getSupabaseAdmin } from "./supabaseAdmin";

// Brand names compared loosely: case, punctuation and apostrophes ignored.
export function normalizeBrandName(v: string): string {
  return v
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// The catalog brand for a company name, only when exactly one matches. An
// ambiguous or missing match returns null and the admin links it by hand.
export async function findCatalogBrandId(companyName: string): Promise<string | null> {
  const { data, error } = await getSupabaseAdmin().from("catalog_brands").select("id, name");
  if (error) throw new Error(`catalog_brands lookup failed: ${error.message}`);
  const target = normalizeBrandName(companyName);
  const matches = (data ?? []).filter((b) => normalizeBrandName(b.name) === target);
  return matches.length === 1 ? matches[0].id : null;
}
