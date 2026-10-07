// Local copy of qoyl-beta's lib/styleMatchSummary.ts StructuredService/
// findMatchingService - can't import across repos, so this mirrors that
// logic exactly. Keep in sync if the shape there changes.
//
// services_structured's real shape comes from whatever qoyl-business's own
// stylist account form writes - that form has no edit UI yet (see
// app/stylist/account/page.tsx, currently read-only), so this is mostly
// unpopulated on real accounts today.
export type StructuredService = {
  name: string;
  price_min: number | null;
  price_max: number | null;
  duration_min: number | null;
  duration_max: number | null;
  deposit_required: boolean;
  deposit_amount: number | null;
  hair_types_served?: string[];
  hair_addition_types?: string[];
  notes: string | null;
};

// Matches a detected style name against a stylist's services_structured
// array. Case-insensitive, either-direction substring match, so "Knotless
// Braids" matches a service literally named "Knotless Braids" as well as
// one named just "Braids".
export function findMatchingService(services: unknown, styleName: string): StructuredService | null {
  if (!Array.isArray(services)) return null;
  const target = styleName.trim().toLowerCase();

  for (const raw of services) {
    if (!raw || typeof raw !== "object") continue;
    const svc = raw as Partial<StructuredService>;
    if (typeof svc.name !== "string") continue;
    const name = svc.name.trim().toLowerCase();
    if (name === target || name.includes(target) || target.includes(name)) {
      return {
        name: svc.name,
        price_min: svc.price_min ?? null,
        price_max: svc.price_max ?? null,
        duration_min: svc.duration_min ?? null,
        duration_max: svc.duration_max ?? null,
        deposit_required: Boolean(svc.deposit_required),
        deposit_amount: svc.deposit_amount ?? null,
        hair_types_served: svc.hair_types_served,
        hair_addition_types: svc.hair_addition_types,
        notes: svc.notes ?? null,
      };
    }
  }
  return null;
}
