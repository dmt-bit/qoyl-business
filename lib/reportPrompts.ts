import type { ReportInputs, ReportProductInput } from "./reportData";
import type { ReportType } from "./reportUtils";

// Shared rules for every report. The model may only use the data in the prompt.
const RULES = `
Write in lowercase. Plain technical language, no marketing words.
Use only the data below. Do not estimate scores, percentages, search volumes, or
brands that are not in the data. Do not invent example brands or projected
improvements.
If a section has no data, say so plainly in that field (for example "not enough search data yet").
Return one JSON object and nothing else.`;

function productBlock(p: ReportProductInput): string {
  if (!p.report) return `PRODUCT: ${p.name}\nscore data: not available yet`;
  const r = p.report;
  return `PRODUCT: ${p.name}
category: ${p.category ?? "unknown"}
average score: ${r.averageScore}
percentile in category: ${r.percentile ?? "not available"} (sample of ${r.percentileSampleSize})
profile scores: ${JSON.stringify(r.profiles.map((x) => ({ label: x.label, score: x.score, tier: x.tier })))}
top ingredients (by position): ${JSON.stringify(r.ingredients.slice(0, 10).map((i) => ({ position: i.position, name: i.inciName, function: i.primaryFunction, ratings: i.ratings, flag: i.flag })))}
flagged ingredients: ${JSON.stringify(r.ingredients.filter((i) => i.flag).map((i) => ({ position: i.position, name: i.inciName, flag: i.flag })))}
key finding from the scoring engine: ${r.keyFinding}`;
}

export function buildPrompt(
  type: ReportType,
  inputs: ReportInputs,
  product: ReportProductInput | null,
  target: { curl: string; porosity: string; goal: string | null }
): string {
  const header = `You are writing a monthly r&d report for a hair care brand.\nBrand: ${inputs.brandName}\nTarget segment: curl ${target.curl}, porosity ${target.porosity}\nPrimary goal: ${target.goal ?? "all of the above"}`;

  switch (type) {
    case "reformulation":
      return `${header}\n\n${productBlock(product!)}\n\n${RULES}\n
Required JSON keys:
executive_summary (string, 2-3 sentences: current performance for the target segment and the main opportunity),
formulation_gaps (array of objects: ingredient_name, position, why_it_flags, recommended_swap, current_score_impact; max 3 items, only ingredients from the flagged list),
quick_wins (array of strings, 2-3 items, lowest-cost changes),
longer_term_opportunity (string, one paragraph)`;

    case "segment_targeting":
      return `${header}\n\n${productBlock(product!)}\n\n${RULES}\n
Required JSON keys:
executive_summary (string, 2-3 sentences),
strongest_segments (array of objects: segment_label, score, why_it_works; top 3 from the profile scores),
growth_opportunities (array of objects: segment_label, score, what_holds_it_back; profiles scoring 40-69, max 2),
segments_to_avoid (array of objects: segment_label, score; profiles below 40),
geographic_focus (string: say "no geographic search data yet" when there is none)`;

    case "competitive":
      return `${header}\n\n${productBlock(product!)}\n\nCOMPETITORS in the same category (average score):\n${JSON.stringify(product!.competitors)}\n\n${RULES}\n
Required JSON keys:
executive_summary (string),
where_you_win (array of strings, only where the brand's average is above the category sample average),
where_you_lose (array of strings, only where it is below),
competitive_advantage (string, based on the ingredient data only),
vulnerability (string). If there are no competitors, say so in each field.`;

    case "trend_signals":
      return `${header}\n\nQOYL SEARCH DATA (last ${inputs.searchWindowDays} days, most searched products):\n${JSON.stringify(inputs.topSearchedProducts)}\n\n${RULES}\n
Required JSON keys:
executive_summary (string),
rising_ingredient_trends (array of strings; "not enough search data yet" if the search list is short),
emerging_hair_concerns (array of strings),
early_signals (array of strings),
recommendation (string, one specific action)`;
  }
}

// The keys each report type must contain, with the type each one takes.
const REQUIRED: Record<ReportType, Record<string, "string" | "array">> = {
  reformulation: { executive_summary: "string", formulation_gaps: "array", quick_wins: "array", longer_term_opportunity: "string" },
  segment_targeting: { executive_summary: "string", strongest_segments: "array", growth_opportunities: "array", segments_to_avoid: "array", geographic_focus: "string" },
  competitive: { executive_summary: "string", where_you_win: "array", where_you_lose: "array", competitive_advantage: "string", vulnerability: "string" },
  trend_signals: { executive_summary: "string", rising_ingredient_trends: "array", emerging_hair_concerns: "array", early_signals: "array", recommendation: "string" },
};

// Returns the reason a reply is unusable, or null when it has every required key.
export function invalidContentReason(type: ReportType, content: Record<string, unknown>): string | null {
  for (const [key, kind] of Object.entries(REQUIRED[type])) {
    const value = content[key];
    if (kind === "string" && typeof value !== "string") return `missing string "${key}"`;
    if (kind === "array" && !Array.isArray(value)) return `missing array "${key}"`;
  }
  return null;
}
