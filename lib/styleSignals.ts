import { getSupabaseAdmin } from "./supabaseAdmin";
import { lookupCityState } from "./zipLookup";

export type EnrichedMatch = {
  detectedStyle: string;
  requiresFakeHair: boolean;
  followedThrough: boolean;
  city: string | null;
  createdAt: string | null;
  compatibleHairTypes: string[];
};

// style_matches has no city column, and hair_profiles is mostly anonymous
// (user_id null on most rows) -- this join only resolves a city for
// matches whose user has a linked profile with a zip code. That's
// expected to be a small slice of the data today; the honest fix is
// qoyl-beta capturing city/zip directly on the style_matches row going
// forward, which is out of scope for this pass. requiresFakeHair reads
// directly off detected_details (already computed by the Style Match
// analyze step), not a join against the styles catalog.
export async function fetchEnrichedStyleMatches(): Promise<EnrichedMatch[]> {
  const supabase = getSupabaseAdmin();

  const [{ data: matches, error: matchesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("style_matches")
        .select("user_id, detected_style, detected_details, followed_through, created_at"),
      supabase.from("hair_profiles").select("user_id, zip_code").not("user_id", "is", null),
    ]);

  if (matchesError) throw new Error(matchesError.message);
  if (profilesError) throw new Error(profilesError.message);

  const zipByUserId = new Map<string, string>();
  for (const p of profiles ?? []) {
    if (p.user_id && p.zip_code) zipByUserId.set(p.user_id, p.zip_code);
  }

  const uniqueZips = Array.from(new Set(Array.from(zipByUserId.values())));
  const cityByZip = new Map<string, string>();
  await Promise.all(
    uniqueZips.map(async (zip) => {
      const result = await lookupCityState(zip);
      if (result) cityByZip.set(zip, `${result.city}, ${result.stateAbbreviation}`);
    })
  );

  return (matches ?? []).map((m) => {
    const zip = m.user_id ? zipByUserId.get(m.user_id) : undefined;
    const city = zip ? cityByZip.get(zip) ?? null : null;
    const details = (m.detected_details ?? {}) as {
      requires_fake_hair?: boolean;
      compatible_hair_types?: string[];
    };

    return {
      detectedStyle: m.detected_style ?? "Unknown style",
      requiresFakeHair: details.requires_fake_hair === true,
      followedThrough: m.followed_through === true,
      city,
      createdAt: m.created_at,
      compatibleHairTypes: details.compatible_hair_types ?? [],
    };
  });
}

function rankByCityStyle(
  rows: EnrichedMatch[]
): { city: string; style: string; count: number }[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (!row.city) continue;
    const key = `${row.city}|||${row.detectedStyle}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([key, count]) => {
      const [city, style] = key.split("|||");
      return { city, style, count };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
}

export type StyleMatchSignals = {
  totalMatches: number;
  matchesWithKnownCity: number;
  mostMatchedByCity: { city: string; style: string; count: number }[];
  fakeHairDemandByCity: { city: string; style: string; count: number }[];
  conversionRate: { total: number; followedThrough: number; ratePct: number | null };
};

export async function getStyleMatchSignals(): Promise<StyleMatchSignals> {
  const enriched = await fetchEnrichedStyleMatches();

  const totalMatches = enriched.length;
  const withCity = enriched.filter((m) => m.city !== null);
  const followedThroughCount = enriched.filter((m) => m.followedThrough).length;

  return {
    totalMatches,
    matchesWithKnownCity: withCity.length,
    mostMatchedByCity: rankByCityStyle(withCity),
    fakeHairDemandByCity: rankByCityStyle(withCity.filter((m) => m.requiresFakeHair)),
    conversionRate: {
      total: totalMatches,
      followedThrough: followedThroughCount,
      ratePct: totalMatches > 0 ? Math.round((followedThroughCount / totalMatches) * 100) : null,
    },
  };
}

// Scoped to a specific set of style names (case-insensitive) -- used by
// the fake hair brand dashboard to answer "cities with highest demand for
// their hair type", where "their hair type" resolves to whichever styles
// their registered products are tied to.
export async function getCityDemandForStyles(
  styleNames: string[]
): Promise<{ city: string; count: number }[]> {
  if (styleNames.length === 0) return [];
  const normalized = new Set(styleNames.map((s) => s.toLowerCase()));

  const enriched = await fetchEnrichedStyleMatches();
  const relevant = enriched.filter((m) => m.city && normalized.has(m.detectedStyle.toLowerCase()));

  const counts = new Map<string, number>();
  for (const m of relevant) {
    counts.set(m.city!, (counts.get(m.city!) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([city, count]) => ({ city, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}
