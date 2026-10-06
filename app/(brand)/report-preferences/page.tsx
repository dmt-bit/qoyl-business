"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useBrandSession } from "@/lib/brandSession";

type Prefs = {
  wants_reformulation: boolean;
  wants_segment_targeting: boolean;
  wants_competitive: boolean;
  wants_trend_signals: boolean;
  target_segment_curl: string | null;
  target_segment_porosity: string | null;
  primary_rd_goal: string | null;
  focus_product_id: string | null;
  email_reports: boolean;
};

type ReportKey = "wants_reformulation" | "wants_segment_targeting" | "wants_competitive" | "wants_trend_signals";

const REPORTS: { key: ReportKey; title: string; body: string; popular?: boolean }[] = [
  {
    key: "wants_reformulation",
    title: "reformulation report",
    body: "which ingredients to swap and why, for your target segment",
    popular: true,
  },
  {
    key: "wants_segment_targeting",
    title: "segment targeting report",
    body: "which hair types your formula wins with, and which are within reach with minor adjustments",
  },
  {
    key: "wants_competitive",
    title: "competitive positioning",
    body: "how your product scores against similar products in the qoyl catalog: where you win and where you lose",
  },
  {
    key: "wants_trend_signals",
    title: "trend signals",
    body: "which ingredients and concerns are rising in search on qoyl, before they show up in sales data",
  },
];

const GOALS: { value: string; label: string }[] = [
  { value: "expand_audience", label: "expand my audience" },
  { value: "improve_formula", label: "improve my formula" },
  { value: "competitive_positioning", label: "understand my competition" },
  { value: "all", label: "all of the above" },
];

const DEFAULTS: Prefs = {
  wants_reformulation: true,
  wants_segment_targeting: true,
  wants_competitive: false,
  wants_trend_signals: false,
  target_segment_curl: "all hair types",
  target_segment_porosity: "all porosity levels",
  primary_rd_goal: "all",
  focus_product_id: null,
  email_reports: true,
};

const CURL_OPTIONS = ["all hair types", "straight (1a-1c)", "wavy (2a-2c)", "curly (3a-3c)", "coily (4a-4c)"];
const POROSITY_OPTIONS = ["all porosity levels", "low", "medium", "high"];
const MONO = "font-[family-name:var(--font-mono-apply)]";
const GROTESK = "font-[family-name:var(--font-grotesk)]";

export default function ReportPreferencesPage() {
  const { session, account } = useBrandSession();
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);
  const [products, setProducts] = useState<{ id: string; name: string }[]>([]);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!session) return;
    fetch("/api/business/brand/report-preferences", { headers: { Authorization: `Bearer ${session.access_token}` } })
      .then((r) => r.json())
      .then((d) => {
        if (d.prefs) setPrefs({ ...DEFAULTS, ...d.prefs });
        setProducts(d.products ?? []);
      })
      .catch(() => setError("Could not load your preferences."));
  }, [session]);

  function set<K extends keyof Prefs>(key: K, value: Prefs[K]) {
    setPrefs((p) => ({ ...p, [key]: value }));
  }

  async function save() {
    if (!session) return;
    setBusy(true);
    setError(null);
    const res = await fetch("/api/business/brand/report-preferences", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify(prefs),
    });
    const body = await res.json().catch(() => ({}));
    setBusy(false);
    if (!res.ok || !body.success) setError(body.message ?? "Could not save your preferences.");
    else setSaved(true);
  }

  if (!account) return null;

  const label = `${MONO} mb-3 text-[9px] lowercase tracking-[0.12em] text-[#888]`;
  const card = (on: boolean) =>
    `relative border bg-white p-4 text-left transition-colors ${on ? "border-[#0a0a0a]" : "border-[#e8e8e8]"}`;

  return (
    <div className="min-h-screen bg-white text-[#0a0a0a]" style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
      <main className="mx-auto max-w-[560px] px-6 py-12">
        {saved ? (
          <div>
            <h1 className={`${GROTESK} text-[28px] font-bold lowercase tracking-[-1px]`}>preferences saved.</h1>
            <p className={`${GROTESK} mt-3 text-sm font-light text-[#666]`}>your first report generates on the 1st of next month.</p>
            <Link href="/dashboard" className={`${MONO} mt-8 inline-block text-[10px] lowercase text-[#888] underline`}>
              back to dashboard →
            </Link>
          </div>
        ) : (
          <>
            <h1 className={`${GROTESK} text-[28px] font-bold lowercase tracking-[-1px]`}>your monthly r&amp;d reports</h1>
            <p className={`${GROTESK} mb-10 mt-2 text-sm font-light leading-[1.75] text-[#666]`}>
              choose what intelligence you want each month. we generate a draft, review it, and send it on the first of the month.
            </p>

            <p className={label}>which reports do you want?</p>
            <div className="space-y-2">
              {REPORTS.map((r) => {
                const on = prefs[r.key];
                return (
                  <button key={r.key} type="button" onClick={() => set(r.key, !on)} className={card(on)}>
                    {on && <span className={`${MONO} absolute right-4 top-4 text-[12px]`}>✓</span>}
                    {r.popular && (
                      <span className={`${MONO} mb-2 inline-block bg-black px-2 py-0.5 text-[8px] lowercase text-white`}>most popular</span>
                    )}
                    <span className={`${GROTESK} block text-[15px] font-semibold lowercase`}>{r.title}</span>
                    <span className={`${GROTESK} mt-1 block text-[12px] font-light leading-[1.6] text-[#666]`}>{r.body}</span>
                  </button>
                );
              })}
            </div>

            <p className={`${label} mt-10`}>who is your target customer?</p>
            <p className={`${GROTESK} -mt-2 mb-4 text-xs font-light text-[#888]`}>we&apos;ll focus your reports on this segment</p>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className={`${MONO} mb-1 block text-[9px] lowercase text-[#888]`}>curl type</span>
                <select value={prefs.target_segment_curl ?? ""} onChange={(e) => set("target_segment_curl", e.target.value)} className="w-full border border-[#0a0a0a] bg-white px-3 py-2 text-sm">
                  {CURL_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={`${MONO} mb-1 block text-[9px] lowercase text-[#888]`}>porosity</span>
                <select value={prefs.target_segment_porosity ?? ""} onChange={(e) => set("target_segment_porosity", e.target.value)} className="w-full border border-[#0a0a0a] bg-white px-3 py-2 text-sm">
                  {POROSITY_OPTIONS.map((o) => (
                    <option key={o} value={o}>{o}</option>
                  ))}
                </select>
              </label>
            </div>

            <p className={`${label} mt-10`}>what&apos;s your primary goal?</p>
            <div className="grid grid-cols-2 gap-2">
              {GOALS.map((g) => (
                <button key={g.value} type="button" onClick={() => set("primary_rd_goal", g.value)} className={`${card(prefs.primary_rd_goal === g.value)} text-[13px] lowercase`}>
                  {g.label}
                </button>
              ))}
            </div>

            {products.length > 1 && (
              <>
                <p className={`${label} mt-10`}>which product should we focus on?</p>
                <select value={prefs.focus_product_id ?? ""} onChange={(e) => set("focus_product_id", e.target.value || null)} className="w-full border border-[#0a0a0a] bg-white px-3 py-2 text-sm">
                  <option value="">all my products</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>{p.name.toLowerCase()}</option>
                  ))}
                </select>
              </>
            )}

            <label className={`${GROTESK} mt-8 flex items-center gap-3 text-sm font-light`}>
              <input type="checkbox" checked={prefs.email_reports} onChange={(e) => set("email_reports", e.target.checked)} />
              email me each report when it&apos;s sent
            </label>

            {error && <p className="mt-6 border border-[#0a0a0a] bg-[#f5f5f5] px-4 py-3 text-sm">{error}</p>}

            <button type="button" onClick={save} disabled={busy} className="mt-10 w-full bg-[#0a0a0a] py-4 text-xs font-semibold lowercase text-white disabled:opacity-50">
              {busy ? "saving…" : "save my preferences →"}
            </button>
          </>
        )}
      </main>
    </div>
  );
}
