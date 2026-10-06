import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminPassword } from "@/lib/adminAuth";
import { sendEmail } from "@/lib/email";
import { reportEmail } from "@/lib/emailTemplates";
import { siteUrl } from "@/lib/brandSignup";

export const dynamic = "force-dynamic";

// Approves a reviewed draft and emails it to the brand. Brands who turned off
// report email keep the report on their dashboard; the email is skipped.
export async function POST(request: Request, { params }: { params: { reportId: string } }) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAdminPassword(body.password)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: report } = await admin
    .from("brand_rd_reports")
    .select("id, brand_account_id, report_type, report_month, title, content, status, product_id, brand_accounts(email, contact_name, company_name), catalog_products(name)")
    .eq("id", params.reportId)
    .maybeSingle();
  if (!report) return NextResponse.json({ success: false, message: "Report not found." }, { status: 404 });
  if (report.status === "sent") return NextResponse.json({ success: false, message: "Already sent." }, { status: 409 });

  const brand = report.brand_accounts as unknown as { email: string; contact_name: string; company_name: string } | null;
  const product = report.catalog_products as unknown as { name: string } | null;
  if (!brand) return NextResponse.json({ success: false, message: "Brand account missing." }, { status: 500 });

  const { data: prefs } = await admin
    .from("brand_report_preferences")
    .select("email_reports")
    .eq("brand_account_id", report.brand_account_id)
    .maybeSingle();

  const now = new Date().toISOString();
  const emailOptOut = prefs?.email_reports === false;
  if (emailOptOut) {
    await admin.from("brand_rd_reports").update({ status: "approved", approved_at: now }).eq("id", report.id);
    return NextResponse.json({ success: true, sent: false, reason: "brand has turned off report emails; it's on their dashboard" });
  }

  const mail = reportEmail({
    reportMonth: report.report_month,
    reportType: report.report_type,
    productName: product?.name ?? brand.company_name,
    firstName: brand.contact_name.trim().split(/\s+/)[0] || "there",
    content: report.content as Record<string, unknown>,
    dashboardUrl: `${siteUrl()}/dashboard`,
    preferencesUrl: `${siteUrl()}/report-preferences`,
  });
  const result = await sendEmail({ to: brand.email, ...mail });
  if (!result.sent) {
    console.error("[send-report] email failed:", result.error);
    return NextResponse.json({ success: false, message: `Email failed: ${result.error}` }, { status: 502 });
  }

  await admin.from("brand_rd_reports").update({ status: "sent", approved_at: now, sent_at: now }).eq("id", report.id);
  return NextResponse.json({ success: true, sent: true });
}
