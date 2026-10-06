import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminPassword } from "@/lib/adminAuth";
import { generateJson } from "@/lib/anthropic";
import { gatherReportInputs } from "@/lib/reportData";
import { buildPrompt, invalidContentReason } from "@/lib/reportPrompts";
import { generateReportTitle, reportMonthStart, type ReportType } from "@/lib/reportUtils";

export const dynamic = "force-dynamic";
// Claude runs once per report; a brand with several products can take a while.
export const maxDuration = 300;

type Prefs = {
  brand_account_id: string;
  wants_reformulation: boolean;
  wants_segment_targeting: boolean;
  wants_competitive: boolean;
  wants_trend_signals: boolean;
  target_segment_curl: string | null;
  target_segment_porosity: string | null;
  primary_rd_goal: string | null;
  focus_product_id: string | null;
};

type DetailStatus = "generated" | "skipped" | "failed";

function requestedTypes(p: Prefs): ReportType[] {
  const types: ReportType[] = [];
  if (p.wants_reformulation) types.push("reformulation");
  if (p.wants_segment_targeting) types.push("segment_targeting");
  if (p.wants_competitive) types.push("competitive");
  if (p.wants_trend_signals) types.push("trend_signals");
  return types;
}

// Creates draft reports for active brands with a completed survey. Nothing is
// sent here: drafts wait in /admin until you approve them. Re-running for the
// same month skips reports that already exist.
export async function POST(request: Request) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }
  if (!isAdminPassword(body.password)) {
    return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });
  }

  const admin = getSupabaseAdmin();
  const month = typeof body.month_date === "string" ? new Date(`${body.month_date}T00:00:00Z`) : new Date();
  const reportMonth = reportMonthStart(month);
  const brandFilter = typeof body.brand_account_id === "string" ? body.brand_account_id : null;

  let prefsQuery = admin.from("brand_report_preferences").select("*").not("survey_completed_at", "is", null);
  if (brandFilter) prefsQuery = prefsQuery.eq("brand_account_id", brandFilter);
  const { data: prefRows, error: prefsError } = await prefsQuery;
  if (prefsError) return NextResponse.json({ success: false, message: prefsError.message }, { status: 500 });

  const brandIds = (prefRows ?? []).map((p) => p.brand_account_id);
  const { data: brands } = brandIds.length
    ? await admin.from("brand_accounts").select("id, company_name, brand_id, status").in("id", brandIds)
    : { data: [] };
  const activeBrands = new Map((brands ?? []).filter((b) => b.status === "active").map((b) => [b.id, b]));

  const summary = {
    brands_processed: 0,
    reports_generated: 0,
    reports_skipped: 0,
    reports_failed: 0,
    details: [] as { brand: string; report_type: string; product: string | null; status: DetailStatus; error?: string }[],
  };

  for (const prefs of (prefRows ?? []) as Prefs[]) {
    const brand = activeBrands.get(prefs.brand_account_id);
    if (!brand) continue;
    summary.brands_processed += 1;

    const target = {
      curl: prefs.target_segment_curl ?? "all hair types",
      porosity: prefs.target_segment_porosity ?? "all porosity levels",
      goal: prefs.primary_rd_goal,
    };
    let inputs;
    try {
      inputs = await gatherReportInputs(brand, prefs.focus_product_id);
    } catch (err) {
      summary.reports_failed += 1;
      summary.details.push({ brand: brand.company_name, report_type: "*", product: null, status: "failed", error: err instanceof Error ? err.message : String(err) });
      continue;
    }

    for (const type of requestedTypes(prefs)) {
      // Trends cover the whole catalog, so they're one report per brand, not per product.
      const targets = type === "trend_signals" ? [null] : inputs.products;
      for (const product of targets) {
        const productName = product?.name ?? brand.company_name;
        let existingQuery = admin
          .from("brand_rd_reports")
          .select("id")
          .eq("brand_account_id", brand.id)
          .eq("report_type", type)
          .eq("report_month", reportMonth);
        existingQuery = product ? existingQuery.eq("product_id", product.id) : existingQuery.is("product_id", null);
        const { data: existing } = await existingQuery.limit(1);
        if (existing && existing.length > 0) {
          summary.reports_skipped += 1;
          summary.details.push({ brand: brand.company_name, report_type: type, product: product?.name ?? null, status: "skipped" });
          continue;
        }

        try {
          const content = await generateJson(buildPrompt(type, inputs, product, target));
          const reason = invalidContentReason(type, content);
          if (reason) throw new Error(`reply ${reason}`);

          const { error: insertError } = await admin.from("brand_rd_reports").insert({
            brand_account_id: brand.id,
            product_id: product?.id ?? null,
            report_month: reportMonth,
            report_type: type,
            title: generateReportTitle(type, productName, month),
            summary: typeof content.executive_summary === "string" ? content.executive_summary : null,
            content,
            status: "draft",
            claude_generated_at: new Date().toISOString(),
          });
          if (insertError) throw new Error(insertError.message);

          summary.reports_generated += 1;
          summary.details.push({ brand: brand.company_name, report_type: type, product: product?.name ?? null, status: "generated" });
        } catch (err) {
          const message = err instanceof Error ? err.message : String(err);
          console.error("[generate-reports] failed:", brand.company_name, type, message);
          summary.reports_failed += 1;
          summary.details.push({ brand: brand.company_name, report_type: type, product: product?.name ?? null, status: "failed", error: message });
        }
      }
    }
  }

  return NextResponse.json({ success: true, ...summary });
}
