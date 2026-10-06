import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isAdminPassword } from "@/lib/adminAuth";

export const dynamic = "force-dynamic";

// Admin edits to a draft. Only the editable text fields change; the rest of
// the content is kept as Claude wrote it.
export async function PATCH(request: Request, { params }: { params: { reportId: string } }) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAdminPassword(body.password)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

  const admin = getSupabaseAdmin();
  const { data: report } = await admin.from("brand_rd_reports").select("id, status, content").eq("id", params.reportId).maybeSingle();
  if (!report) return NextResponse.json({ success: false, message: "Report not found." }, { status: 404 });
  if (report.status === "sent") return NextResponse.json({ success: false, message: "Already sent; it can't be edited." }, { status: 409 });

  const edits = body.content as Record<string, unknown> | undefined;
  const update: Record<string, unknown> = { reviewed_at: new Date().toISOString(), status: "reviewed" };
  if (edits && typeof edits === "object") {
    const merged = { ...(report.content as Record<string, unknown>), ...edits };
    update.content = merged;
    update.summary = typeof merged.executive_summary === "string" ? merged.executive_summary : null;
    update.was_edited = JSON.stringify(merged) !== JSON.stringify(report.content);
  }
  if (typeof body.admin_notes === "string") update.admin_notes = body.admin_notes.slice(0, 2000);

  const { error } = await admin.from("brand_rd_reports").update(update).eq("id", params.reportId);
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}

// Discards a draft. Nothing is sent, and the row is removed so the brand never sees it.
export async function DELETE(request: Request, { params }: { params: { reportId: string } }) {
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (!isAdminPassword(body.password)) return NextResponse.json({ success: false, message: "Unauthorized." }, { status: 401 });

  const { error } = await getSupabaseAdmin()
    .from("brand_rd_reports")
    .delete()
    .eq("id", params.reportId)
    .neq("status", "sent");
  if (error) return NextResponse.json({ success: false, message: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
