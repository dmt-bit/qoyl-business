// Calls qoyl-beta's shared scoring engine (/api/internal/score-report) for a
// brand's product. The scoring code lives in qoyl-beta; this repo only holds
// the response shape. Server-only: the shared key must never reach a browser.
//
// Returns null when the bridge isn't configured or the call fails - callers
// then send the approval email without a score preview rather than blocking
// the approval.

export type ScoreProfile = {
  profile: { curl_type: string; porosity: string; climate: string; scalp: string };
  label: string;
  score: number;
  tier: "green" | "amber" | "red";
};

export type ScoreReportResult =
  | { status: "not_in_catalog"; message: string }
  | {
      status: "ok";
      product: { id: string; name: string; brand: string; category: string | null };
      profiles: ScoreProfile[];
      averageScore: number;
      topSegments: ScoreProfile[];
      bottomSegments: ScoreProfile[];
      percentile: number | null;
      percentileSampleSize: number;
      ingredients: {
        position: number;
        inciName: string;
        primaryFunction: string | null;
        ratings: { high: string | null; medium: string | null; low: string | null };
        flag: string | null;
      }[];
      keyFinding: string;
    };

export async function fetchScoreReport(
  productName: string,
  brandName: string | null
): Promise<ScoreReportResult | null> {
  const baseUrl = process.env.QOYL_BETA_URL;
  const key = process.env.QOYL_INTERNAL_API_KEY;
  if (!baseUrl || !key) {
    console.error("[score-report] QOYL_BETA_URL or QOYL_INTERNAL_API_KEY not set");
    return null;
  }

  try {
    const res = await fetch(`${baseUrl.replace(/\/$/, "")}/api/internal/score-report`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-internal-key": key },
      body: JSON.stringify({ productName, brandName }),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[score-report] bridge returned", res.status);
      return null;
    }
    return (await res.json()) as ScoreReportResult;
  } catch (err) {
    console.error("[score-report] bridge call failed:", err instanceof Error ? err.message : err);
    return null;
  }
}
