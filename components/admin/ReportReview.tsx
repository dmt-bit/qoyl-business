"use client";

import { useState } from "react";
import ReportBody from "@/components/brand/ReportBody";
import { getReportTypeLabel, monthName } from "@/lib/reportUtils";

export type AdminReport = {
  id: string;
  brand_account_id: string;
  report_type: string;
  report_month: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown>;
  status: string;
  claude_generated_at: string | null;
  product_id: string | null;
  brand_accounts: { company_name: string } | null;
  catalog_products: { name: string } | null;
};

// Admin review of Claude's drafts. Nothing reaches a brand until "send".
export function ReportReviewQueue({ reports, password }: { reports: AdminReport[]; password: string }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const pending = reports.filter((r) => r.status === "draft" || r.status === "reviewed");
  const byBrand = new Map<string, AdminReport[]>();
  for (const r of pending) {
    byBrand.set(r.brand_account_id, [...(byBrand.get(r.brand_account_id) ?? []), r]);
  }

  async function call(url: string, method: "POST" | "PATCH" | "DELETE", body: Record<string, unknown>) {
    setBusy(true);
    setMessage(null);
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, password }) });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !data.success) {
      setMessage(data.message ?? `Failed (HTTP ${res.status}).`);
      return false;
    }
    return data;
  }

  function startEdit(r: AdminReport) {
    // Only top-level text and text lists are editable here. Structured items
    // (gaps, segments) are shown as Claude wrote them.
    const fields: Record<string, string> = {};
    for (const [key, value] of Object.entries(r.content)) {
      if (typeof value === "string") fields[key] = value;
      if (Array.isArray(value) && value.every((v) => typeof v === "string")) fields[key] = (value as string[]).join("\n");
    }
    setDrafts(fields);
    setEditing(r.id);
  }

  async function saveEdits(r: AdminReport) {
    const content: Record<string, unknown> = { ...r.content };
    for (const [key, text] of Object.entries(drafts)) {
      content[key] = Array.isArray(r.content[key]) ? text.split("\n").filter((l) => l.trim()) : text;
    }
    const ok = await call(`/api/admin/reports/${r.id}`, "PATCH", { content });
    if (ok) window.location.reload();
  }

  async function send(r: AdminReport) {
    if (!confirm("send this report to the brand now?")) return;
    const ok = await call(`/api/admin/reports/${r.id}/send`, "POST", {});
    if (ok) window.location.reload();
  }

  async function discard(r: AdminReport) {
    if (!confirm("discard this draft? the brand won't see it.")) return;
    const ok = await call(`/api/admin/reports/${r.id}`, "DELETE", {});
    if (ok) window.location.reload();
  }

  return (
    <div>
      {message && <p className="mb-4 border border-red/30 bg-red/10 px-4 py-2 text-sm text-red">{message}</p>}
      {pending.length === 0 && <p className="text-sm text-muted">no drafts waiting for review.</p>}

      {Array.from(byBrand.entries()).map(([brandId, rows]) => (
        <div key={brandId} className="mb-8">
          <p className="mb-3 font-mono text-xs uppercase tracking-wider text-sand">
            {rows[0].brand_accounts?.company_name ?? "brand"} · {rows.length} pending
          </p>
          <div className="space-y-2">
            {rows.map((r) => (
              <div key={r.id} className="rounded-md border border-warm/10 p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full bg-warm/10 px-3 py-1 text-xs uppercase tracking-wider text-cream">
                    {getReportTypeLabel(r.report_type)}
                  </span>
                  <span className="text-xs text-muted">{monthName(r.report_month)}</span>
                  <span className="text-sm text-sand">{r.catalog_products?.name ?? "all products"}</span>
                  <span className="text-xs text-muted">{r.status}</span>
                </div>
                <p className="mt-2 text-sm text-sand">{(r.summary ?? "").slice(0, 120)}{(r.summary ?? "").length > 120 ? "…" : ""}</p>
                <div className="mt-3 flex flex-wrap gap-3 text-xs">
                  <button type="button" onClick={() => setExpanded(expanded === r.id ? null : r.id)} className="text-bronze2 underline">
                    {expanded === r.id ? "close" : "review"}
                  </button>
                  <button type="button" onClick={() => { setExpanded(r.id); startEdit(r); }} className="text-bronze2 underline">
                    edit and send
                  </button>
                  <button type="button" disabled={busy} onClick={() => send(r)} className="text-green underline disabled:opacity-50">
                    approve and send
                  </button>
                  <button type="button" disabled={busy} onClick={() => discard(r)} className="text-red underline disabled:opacity-50">
                    discard
                  </button>
                </div>

                {expanded === r.id && (
                  <div className="mt-4 border-t border-warm/10 pt-4">
                    {editing === r.id ? (
                      <div className="space-y-3">
                        {Object.keys(drafts).map((key) => (
                          <label key={key} className="block">
                            <span className="mb-1 block font-mono text-[10px] uppercase tracking-wider text-muted">{key.replace(/_/g, " ")}</span>
                            <textarea
                              rows={key === "executive_summary" ? 3 : Math.max(2, drafts[key].split("\n").length)}
                              value={drafts[key]}
                              onChange={(e) => setDrafts((d) => ({ ...d, [key]: e.target.value }))}
                              className="w-full rounded border border-warm/20 bg-transparent px-3 py-2 text-sm text-cream"
                            />
                          </label>
                        ))}
                        <div className="flex gap-3 text-xs">
                          <button type="button" disabled={busy} onClick={() => saveEdits(r)} className="text-bronze2 underline">save edits</button>
                          <button type="button" onClick={() => setEditing(null)} className="text-muted underline">cancel</button>
                        </div>
                      </div>
                    ) : (
                      <ReportBody content={r.content} />
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Generates drafts for one brand. Used in the brand accounts table.
export function GenerateBrandReportsButton({ brandAccountId, password }: { brandAccountId: string; password: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    setResult(null);
    const res = await fetch("/api/admin/brands/generate-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password, brand_account_id: brandAccountId }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setResult(res.ok ? `${data.reports_generated} generated · ${data.reports_skipped} skipped · ${data.reports_failed} failed` : data.message ?? "failed");
  }

  return (
    <div className="flex flex-col items-start gap-1">
      <button type="button" disabled={busy} onClick={run} className="text-xs text-bronze2 underline disabled:opacity-50">
        {busy ? "generating…" : "generate report"}
      </button>
      {result && <span className="text-[10px] text-muted">{result}</span>}
    </div>
  );
}

// Generates drafts for every active brand with a completed survey.
export function GenerateAllReportsButton({ password }: { password: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function run() {
    if (!confirm("generate reports for all active brands with completed preferences? this calls claude for each report type requested.")) return;
    setBusy(true);
    setResult("generating… this can take a few minutes");
    const res = await fetch("/api/admin/brands/generate-reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    const data = await res.json().catch(() => ({}));
    setBusy(false);
    setResult(
      res.ok
        ? `${data.reports_generated} generated · ${data.reports_skipped} skipped · ${data.reports_failed} failed across ${data.brands_processed} brands`
        : data.message ?? "failed"
    );
    if (res.ok) window.location.reload();
  }

  return (
    <div className="flex items-center gap-4">
      <button type="button" disabled={busy} onClick={run} className="rounded-full bg-bronze px-5 py-2 text-xs font-medium uppercase tracking-wider text-dark disabled:opacity-50">
        generate r&amp;d reports →
      </button>
      {result && <span className="text-xs text-muted">{result}</span>}
    </div>
  );
}
