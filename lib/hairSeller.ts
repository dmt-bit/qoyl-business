export const PRODUCT_TYPES = [
  "braiding_hair",
  "crochet",
  "wigs",
  "clip_ins",
  "tape_ins",
  "sew_in",
] as const;

export const CATALOG_HAIR_TYPES = [
  "braiding_hair",
  "crochet",
  "wig",
  "clip_in",
  "tape_in",
  "sew_in",
] as const;

export const HAIR_PREFERENCES = ["human", "synthetic", "heat_resistant_synthetic"] as const;
export const SELLER_TIERS = ["standard", "featured"] as const;
export const LENGTH_KEYS = ["shoulder", "bra_strap", "waist", "hip"] as const;

export function isStringArray(v: unknown): v is string[] {
  return Array.isArray(v) && v.every((x) => typeof x === "string");
}
