// Ported unchanged from qoyl-beta's lib/zipLookup.ts, which uses this
// same free public API to resolve a stylist-booking notification email's
// city. Reused here for the same reason: hair_profiles has no city
// column, only zip_code.

export type CityState = {
  city: string;
  stateAbbreviation: string;
};

// Best-effort only - a slow or down external API must never block a
// dashboard render. Falls back to null on any error, timeout, or missing
// zip code.
export async function lookupCityState(
  zipCode: string | null
): Promise<CityState | null> {
  if (!zipCode) return null;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 2000);

    const res = await fetch(`https://api.zippopotam.us/us/${zipCode}`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    if (!res.ok) return null;

    const data = await res.json();
    const place = data.places?.[0];
    if (!place) return null;

    return {
      city: place["place name"],
      stateAbbreviation: place["state abbreviation"],
    };
  } catch {
    return null;
  }
}
