import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { resolveBrandAccess } from "@/lib/brandApiAuth";

export const dynamic = "force-dynamic";

// The brand sees only reports that were sent. Drafts stay admin-only.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const access = await resolveBrandAccess(request, url.searchParams.get("brandId"));
  if (!access.ok) return NextResponse.json({ success: false, message: access.message }, { status: access.status });

  const admin = getSupabaseAdmin();
  const [{ data: prefs }, { data: reports, error }] = await Promise.all([
    admin.from("brand_report_preferences").select("survey_completed_at, email_reports").eq("brand_account_id", access.account.id).maybeSingle(),
    admin
      .from("brand_rd_reports")
      .select("id, report_type, report_month, title, summary, content, sent_at, catalog_products(name)")
      .eq("brand_account_id", access.account.id)
      .eq("status", "sent")
      .order("report_month", { ascending: false })
      .order("created_at", { ascending: false }),
  ]);
  if (error) return NextResponse.json({ success: false, message: "Could not load reports." }, { status: 500 });

  return NextResponse.json({
    surveyCompleted: Boolean(prefs?.survey_completed_at),
    reports: (reports ?? []).map((r) => ({
      id: r.id,
      report_type: r.report_type,
      report_month: r.report_month,
      title: r.title,
      summary: r.summary,
      content: r.content,
      sent_at: r.sent_at,
      product_name: (r.catalog_products as unknown as { name: string } | null)?.name ?? null,
    })),
  });
}
