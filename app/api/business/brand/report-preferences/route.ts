import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveBrandAccess } from "@/lib/brandApiAuth";

export const dynamic = "force-dynamic";

const CURL_OPTIONS = ["all hair types", "straight (1a-1c)", "wavy (2a-2c)", "curly (3a-3c)", "coily (4a-4c)"];
const POROSITY_OPTIONS = ["all porosity levels", "low", "medium", "high"];
const GOAL_OPTIONS = ["expand_audience", "improve_formula", "competitive_positioning", "all"];

// Current preferences plus the brand's own products, for the survey form.
export async function GET(request: Request) {
  const access = await resolveBrandAccess(request, null);
  if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

  const admin = getSupabaseAdmin();
  const [{ data: prefs }, products] = await Promise.all([
    admin.from("brand_report_preferences").select("*").eq("brand_account_id", access.account.id).maybeSingle(),
    access.account.brand_id
      ? admin.from("catalog_products").select("id, name").eq("brand_id", access.account.brand_id).order("name")
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);
  return NextResponse.json({ prefs: prefs ?? null, products: products.data ?? [], options: { CURL_OPTIONS, POROSITY_OPTIONS, GOAL_OPTIONS } });
}

// Saves the survey. One row per brand (upsert on brand_account_id).
export async function POST(request: Request) {
  const access = await resolveBrandAccess(request, null);
  if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const curl = typeof body.target_segment_curl === "string" && CURL_OPTIONS.includes(body.target_segment_curl) ? body.target_segment_curl : "all hair types";
  const porosity = typeof body.target_segment_porosity === "string" && POROSITY_OPTIONS.includes(body.target_segment_porosity) ? body.target_segment_porosity : "all porosity levels";
  const goal = typeof body.primary_rd_goal === "string" && GOAL_OPTIONS.includes(body.primary_rd_goal) ? body.primary_rd_goal : "all";

  // A focus product must be one of this brand's own products.
  let focusProductId: string | null = null;
  if (typeof body.focus_product_id === "string" && body.focus_product_id) {
    const { data: owned } = await getSupabaseAdmin()
      .from("catalog_products")
      .select("id")
      .eq("id", body.focus_product_id)
      .eq("brand_id", access.account.brand_id ?? "")
      .maybeSingle();
    if (!owned) return NextResponse.json({ success: false, message: "Choose one of your products." }, { status: 400 });
    focusProductId = owned.id;
  }

  const now = new Date().toISOString();
  const { error } = await getSupabaseAdmin()
    .from("brand_report_preferences")
    .upsert(
      {
        brand_account_id: access.account.id,
        wants_reformulation: body.wants_reformulation !== false,
        wants_segment_targeting: body.wants_segment_targeting !== false,
        wants_competitive: body.wants_competitive === true,
        wants_trend_signals: body.wants_trend_signals === true,
        target_segment_curl: curl,
        target_segment_porosity: porosity,
        primary_rd_goal: goal,
        focus_product_id: focusProductId,
        email_reports: body.email_reports !== false,
        survey_completed_at: now,
        updated_at: now,
      },
      { onConflict: "brand_account_id" }
    );
  if (error) {
    console.error("[report-preferences] upsert failed:", error.message);
    return NextResponse.json({ success: false, message: "Could not save your preferences." }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
