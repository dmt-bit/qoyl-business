import { getSupabaseAdmin } from "./supabaseAdmin";

export type Porosity = "low" | "medium" | "high";
export type Rating = "good" | "neutral" | "caution" | "avoid";

export const POROSITY_LEVELS: Porosity[] = ["low", "medium", "high"];

export function scoreTier(score: number): "green" | "amber" | "red" {
  if (score >= 70) return "green";
  if (score >= 40) return "amber";
  return "red";
}

export const SCORE_TIER_TEXT_CLASSES: Record<"green" | "amber" | "red", string> = {
  green: "text-green",
  amber: "text-amber",
  red: "text-red",
};

export const RATING_BADGE_CLASSES: Record<Rating, string> = {
  good: "bg-green/15 text-green",
  neutral: "bg-warm/10 text-muted",
  caution: "bg-amber/15 text-amber",
  avoid: "bg-red/15 text-red",
};

type IngredientRow = {
  id: string;
  inci_name: string;
  common_name: string | null;
  silicone_flag: boolean;
  sulfate_flag: boolean;
  protein_flag: boolean;
  alcohol_flag: boolean;
};

function displayName(ing: { inci_name: string; common_name: string | null }): string {
  return ing.common_name || ing.inci_name;
}

export function parseIngredients(text: string): string[] {
  return Array.from(
    new Set(
      text
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .map((s) => s.toLowerCase())
    )
  );
}

function firstWord(s: string): string {
  return s.trim().split(/\s+/)[0] ?? "";
}

function wordOverlapScore(a: string, b: string): number {
  const aWords = a.toLowerCase().split(/\s+/);
  const bWords = new Set(b.toLowerCase().split(/\s+/));
  return aWords.filter((w) => bWords.has(w)).length;
}

function bestByOverlap(name: string, candidates: IngredientRow[]): IngredientRow {
  return candidates.reduce((best, candidate) => {
    const candidateScore = Math.max(
      wordOverlapScore(name, candidate.inci_name),
      wordOverlapScore(name, candidate.common_name ?? "")
    );
    const bestScore = Math.max(
      wordOverlapScore(name, best.inci_name),
      wordOverlapScore(name, best.common_name ?? "")
    );
    return candidateScore > bestScore ? candidate : best;
  });
}

// Real INCI labels almost always embed the common name inside the INCI
// name (e.g. "Cocos Nucifera (Coconut) Oil"), while the ingredients table
// stores botanical/common names as separate columns. Tries progressively
// looser tiers -- exact, then first-word, then substring -- to match a
// brand's pasted label text against the catalog.
function findBestIngredientMatch(
  productIngredientName: string,
  allIngredients: IngredientRow[]
): IngredientRow | null {
  const name = productIngredientName.trim().toLowerCase();
  if (!name) return null;

  const exact = allIngredients.find(
    (ing) =>
      ing.inci_name.trim().toLowerCase() === name ||
      (ing.common_name ?? "").trim().toLowerCase() === name
  );
  if (exact) return exact;

  const nameFirstWord = firstWord(name);
  if (nameFirstWord) {
    const firstWordCandidates = allIngredients.filter(
      (ing) =>
        firstWord(ing.inci_name.toLowerCase()) === nameFirstWord ||
        firstWord((ing.common_name ?? "").toLowerCase()) === nameFirstWord
    );
    if (firstWordCandidates.length === 1) return firstWordCandidates[0];
    if (firstWordCandidates.length > 1) return bestByOverlap(name, firstWordCandidates);
  }

  const containsCandidates = allIngredients.filter((ing) => {
    const inci = ing.inci_name.trim().toLowerCase();
    const common = (ing.common_name ?? "").trim().toLowerCase();
    return (
      (inci.length > 0 && (name.includes(inci) || inci.includes(name))) ||
      (common.length > 0 && (name.includes(common) || common.includes(name)))
    );
  });
  if (containsCandidates.length === 1) return containsCandidates[0];
  if (containsCandidates.length > 1) return bestByOverlap(name, containsCandidates);

  return null;
}

// The shared ingredients table has no functional-category column (mechanism
// and surfactant_subtype are unpopulated across the whole catalog), so
// swap suggestions need a category derived from name keywords and the
// existing boolean flags. This is a heuristic, not authoritative data --
// good enough to group "things doing a similar job" for a swap suggestion.
function deriveFunctionalCategory(ing: IngredientRow): string {
  const name = `${ing.inci_name} ${ing.common_name ?? ""}`.toLowerCase();

  if (ing.silicone_flag || /dimethicone|siloxane|silane/.test(name)) return "silicone";
  if (ing.sulfate_flag || /sulfate/.test(name)) return "sulfate surfactant";
  if (ing.protein_flag || /keratin|collagen|protein|amino acid/.test(name)) return "protein";
  if (ing.alcohol_flag || /\balcohol\b/.test(name)) return "alcohol";
  if (/glycerin|glycol|honey|aloe|panthenol|sorbitol|hyaluronic/.test(name)) return "humectant";
  if (/butter/.test(name)) return "butter";
  if (/\boil\b/.test(name)) return "oil";
  if (/cocamidopropyl|betaine|glucoside|sulfosuccinate|sarcosinate/.test(name)) return "mild surfactant";
  if (/extract|leaf|flower|root|bark/.test(name)) return "botanical extract";
  if (/paraben|phenoxyethanol|benzoate|sorbate/.test(name)) return "preservative";
  if (/fragrance|parfum|essential oil/.test(name)) return "fragrance";
  return "other";
}

async function fetchAllIngredients(): Promise<IngredientRow[]> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("ingredients")
    .select("id, inci_name, common_name, silicone_flag, sulfate_flag, protein_flag, alcohol_flag");

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function matchIngredientList(
  ingredientList: string
): Promise<{ matched: IngredientRow[]; unmatched: string[] }> {
  const names = parseIngredients(ingredientList);
  const allIngredients = await fetchAllIngredients();

  const matched = new Map<string, IngredientRow>();
  const unmatched: string[] = [];

  for (const name of names) {
    const match = findBestIngredientMatch(name, allIngredients);
    if (match) matched.set(match.id, match);
    else unmatched.push(name);
  }

  return { matched: Array.from(matched.values()), unmatched };
}

type ScoreRow = { ingredient_id: string; porosity: Porosity; score: number; rating: Rating };

async function fetchGenericScores(ingredientIds: string[]): Promise<ScoreRow[]> {
  if (ingredientIds.length === 0) return [];
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase
    .from("compatibility_scores")
    .select("ingredient_id, porosity, score, rating")
    .in("ingredient_id", ingredientIds)
    .is("scalp_condition", null);

  if (error) throw new Error(error.message);
  return (data ?? []) as ScoreRow[];
}

export type IngredientBreakdownRow = {
  name: string;
  low: number | null;
  medium: number | null;
  high: number | null;
  flag: Rating | null;
  averageScore: number | null;
};

export type ProductScoreBreakdown = {
  overallByPorosity: Record<Porosity, number | null>;
  ingredientBreakdown: IngredientBreakdownRow[];
  topDrivingDown: { name: string; averageScore: number }[];
  topDrivingUp: { name: string; averageScore: number }[];
  unmatchedIngredients: string[];
};

const RATING_SEVERITY: Record<Rating, number> = { good: 0, neutral: 1, caution: 2, avoid: 3 };

export async function getProductScoreBreakdown(
  ingredientList: string
): Promise<ProductScoreBreakdown> {
  const { matched, unmatched } = await matchIngredientList(ingredientList);
  const scoreRows = await fetchGenericScores(matched.map((m) => m.id));

  const scoresByIngredient = new Map<string, Partial<Record<Porosity, ScoreRow>>>();
  for (const row of scoreRows) {
    const entry = scoresByIngredient.get(row.ingredient_id) ?? {};
    entry[row.porosity] = row;
    scoresByIngredient.set(row.ingredient_id, entry);
  }

  const ingredientBreakdown: IngredientBreakdownRow[] = matched.map((ing) => {
    const rows = scoresByIngredient.get(ing.id) ?? {};
    const scaled: Record<Porosity, number | null> = {
      low: rows.low ? rows.low.score * 10 : null,
      medium: rows.medium ? rows.medium.score * 10 : null,
      high: rows.high ? rows.high.score * 10 : null,
    };

    const presentScores = POROSITY_LEVELS.map((p) => scaled[p]).filter(
      (s): s is number => s !== null
    );
    const averageScore =
      presentScores.length > 0
        ? Math.round(presentScores.reduce((a, b) => a + b, 0) / presentScores.length)
        : null;

    // Worst-case rating across porosities -- the most useful single flag
    // for a brand scanning down the table for problems.
    const worstFlag = POROSITY_LEVELS.reduce<Rating | null>((worst, p) => {
      const rating = rows[p]?.rating;
      if (!rating) return worst;
      if (!worst || RATING_SEVERITY[rating] > RATING_SEVERITY[worst]) return rating;
      return worst;
    }, null);

    return {
      name: displayName(ing),
      low: scaled.low,
      medium: scaled.medium,
      high: scaled.high,
      flag: worstFlag,
      averageScore,
    };
  });

  const overallByPorosity = POROSITY_LEVELS.reduce((acc, porosity) => {
    const scores = ingredientBreakdown
      .map((row) => row[porosity])
      .filter((s): s is number => s !== null);
    acc[porosity] =
      scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null;
    return acc;
  }, {} as Record<Porosity, number | null>);

  const scoredIngredients = ingredientBreakdown.filter(
    (row): row is IngredientBreakdownRow & { averageScore: number } => row.averageScore !== null
  );
  const sortedAscending = [...scoredIngredients].sort((a, b) => a.averageScore - b.averageScore);

  return {
    overallByPorosity,
    ingredientBreakdown: [...ingredientBreakdown].sort(
      (a, b) => (a.averageScore ?? 100) - (b.averageScore ?? 100)
    ),
    topDrivingDown: sortedAscending.slice(0, 3).map((r) => ({
      name: r.name,
      averageScore: r.averageScore,
    })),
    topDrivingUp: sortedAscending
      .slice(-3)
      .reverse()
      .map((r) => ({ name: r.name, averageScore: r.averageScore })),
    unmatchedIngredients: unmatched,
  };
}

export type ReformulationSuggestion = {
  ingredient: string;
  currentScore: number;
  currentFlag: Rating;
  category: string;
  replacement: string | null;
  replacementScore: number | null;
  projectedImprovement: number | null;
  porosity: Porosity;
};

export async function getReformulationSignals(
  ingredientList: string,
  targetPorosity: Porosity
): Promise<ReformulationSuggestion[]> {
  const { matched } = await matchIngredientList(ingredientList);
  if (matched.length === 0) return [];

  const matchedIds = new Set(matched.map((m) => m.id));
  const supabase = getSupabaseAdmin();

  const { data: rows, error } = await supabase
    .from("compatibility_scores")
    .select("ingredient_id, score, rating")
    .eq("porosity", targetPorosity)
    .is("scalp_condition", null);

  if (error) throw new Error(error.message);

  const scoreByIngredientId = new Map(
    (rows ?? []).map((r) => [r.ingredient_id as string, { score: r.score as number, rating: r.rating as Rating }])
  );

  const allIngredients = await fetchAllIngredients();
  const categoryById = new Map(allIngredients.map((ing) => [ing.id, deriveFunctionalCategory(ing)]));

  const flaggedInFormula = matched.filter((ing) => {
    const scored = scoreByIngredientId.get(ing.id);
    return scored && (scored.rating === "caution" || scored.rating === "avoid");
  });

  return flaggedInFormula.map((ing) => {
    const current = scoreByIngredientId.get(ing.id)!;
    const category = categoryById.get(ing.id) ?? "other";

    let bestReplacement: { id: string; score: number } | null = null;
    for (const candidate of allIngredients) {
      if (candidate.id === ing.id || matchedIds.has(candidate.id)) continue;
      if (categoryById.get(candidate.id) !== category) continue;
      const candidateScore = scoreByIngredientId.get(candidate.id);
      if (!candidateScore) continue;
      if (!bestReplacement || candidateScore.score > bestReplacement.score) {
        bestReplacement = { id: candidate.id, score: candidateScore.score };
      }
    }

    const replacementIngredient = bestReplacement
      ? allIngredients.find((i) => i.id === bestReplacement!.id) ?? null
      : null;

    return {
      ingredient: displayName(ing),
      currentScore: current.score * 10,
      currentFlag: current.rating,
      category,
      replacement: replacementIngredient ? displayName(replacementIngredient) : null,
      replacementScore: bestReplacement ? bestReplacement.score * 10 : null,
      projectedImprovement: bestReplacement ? bestReplacement.score * 10 - current.score * 10 : null,
      porosity: targetPorosity,
    };
  });
}

export type ConsumerDemandSignals = {
  topProducts: { name: string; count: number }[];
  topBrands: { name: string; count: number }[];
  avgScoreByPorosity: { porosity: Porosity; averageScore: number | null; count: number }[];
  dailyVolume: { date: string; count: number }[];
  topConcerns: { concern: string; count: number }[];
};

// topProducts/topBrands/avgScoreByPorosity are all-time aggregates across
// every logged search; dailyVolume is the one metric explicitly scoped to
// the last 30 days. All derived from a single fetch of product_searches
// rather than one query per metric.
export async function getConsumerDemandSignals(): Promise<ConsumerDemandSignals> {
  const supabase = getSupabaseAdmin();

  const [{ data: searches, error: searchesError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase
        .from("product_searches")
        .select(
          "product_name, brand_name, compatibility_score, hair_profile_porosity, searched_at"
        ),
      supabase.from("hair_profiles").select("hair_concerns"),
    ]);

  if (searchesError) throw new Error(searchesError.message);
  if (profilesError) throw new Error(profilesError.message);

  const productCounts = new Map<string, number>();
  const brandCounts = new Map<string, number>();
  const scoresByPorosity: Record<Porosity, number[]> = { low: [], medium: [], high: [] };

  for (const s of searches ?? []) {
    if (s.product_name) {
      productCounts.set(s.product_name, (productCounts.get(s.product_name) ?? 0) + 1);
    }
    if (s.brand_name) {
      brandCounts.set(s.brand_name, (brandCounts.get(s.brand_name) ?? 0) + 1);
    }
    const porosity = s.hair_profile_porosity as string | null;
    if (
      s.compatibility_score !== null &&
      (porosity === "low" || porosity === "medium" || porosity === "high")
    ) {
      scoresByPorosity[porosity].push(s.compatibility_score);
    }
  }

  const topProducts = Array.from(productCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const topBrands = Array.from(brandCounts.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const avgScoreByPorosity = POROSITY_LEVELS.map((porosity) => {
    const scores = scoresByPorosity[porosity];
    return {
      porosity,
      averageScore:
        scores.length > 0
          ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
          : null,
      count: scores.length,
    };
  });

  const days: { date: string; count: number }[] = [];
  const today = new Date();
  const todayUTC = new Date(
    Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate())
  );
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayUTC);
    d.setUTCDate(d.getUTCDate() - i);
    days.push({ date: d.toISOString().slice(0, 10), count: 0 });
  }
  const dayIndexByDate = new Map(days.map((d, i) => [d.date, i]));

  for (const s of searches ?? []) {
    if (!s.searched_at) continue;
    const date = s.searched_at.slice(0, 10);
    const idx = dayIndexByDate.get(date);
    if (idx !== undefined) days[idx].count += 1;
  }

  const concernCounts = new Map<string, number>();
  for (const p of profiles ?? []) {
    for (const concern of p.hair_concerns ?? []) {
      concernCounts.set(concern, (concernCounts.get(concern) ?? 0) + 1);
    }
  }
  const topConcerns = Array.from(concernCounts.entries())
    .map(([concern, count]) => ({ concern, count }))
    .sort((a, b) => b.count - a.count);

  return { topProducts, topBrands, avgScoreByPorosity, dailyVolume: days, topConcerns };
}

export async function getPorosityDistribution(): Promise<Record<Porosity, number>> {
  const supabase = getSupabaseAdmin();
  const { data, error } = await supabase.from("hair_profiles").select("porosity");
  if (error) throw new Error(error.message);

  const counts: Record<Porosity, number> = { low: 0, medium: 0, high: 0 };
  for (const row of (data ?? []) as { porosity: string | null }[]) {
    const porosity = row.porosity;
    if (porosity === "low" || porosity === "medium" || porosity === "high") {
      counts[porosity] += 1;
    }
  }
  return counts;
}
