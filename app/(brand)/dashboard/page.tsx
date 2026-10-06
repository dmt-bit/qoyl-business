"use client";

import { useEffect, useState } from "react";
import { useBrandSession } from "@/lib/brandSession";
import BrandDashboard, { type DashboardData } from "@/components/brand/BrandDashboard";
import type { SentReport } from "@/components/brand/ReportsSection";
import { grotesk, mono } from "@/lib/brandFonts";

// The brand dashboard. Data comes from /api/business/brand/dashboard, which
// resolves the brand from the login token. The admin preview reuses this page
// with the same API and passes brandId.
export default function DashboardPage() {
  const { loading: sessionLoading, account, session } = useBrandSession();
  const [data, setData] = useState<DashboardData | null>(null);
  const [reports, setReports] = useState<{ surveyCompleted: boolean; reports: SentReport[] }>({ surveyCompleted: false, reports: [] });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!account || !session) return;
    let cancelled = false;
    const headers = { Authorization: `Bearer ${session.access_token}` };
    fetch(`/api/business/brand/dashboard?brandId=${account.id}`, { headers })
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) throw new Error(body.message ?? "Could not load the dashboard.");
        return body as DashboardData;
      })
      .then((d) => !cancelled && setData(d))
      .catch((err: Error) => !cancelled && setError(err.message));
    // Reports are optional: if they fail to load, the rest of the dashboard still shows.
    fetch(`/api/business/brand/reports?brandId=${account.id}`, { headers })
      .then((res) => (res.ok ? res.json() : null))
      .then((r) => r && !cancelled && setReports({ surveyCompleted: r.surveyCompleted, reports: r.reports }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [account, session]);

  async function requestProduct(name: string): Promise<string> {
    if (!session) return "Sign in again to send a request.";
    const res = await fetch("/api/business/brand/request-product", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session.access_token}` },
      body: JSON.stringify({ product_name: name }),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok || !body.success) return body.message ?? "Something went wrong.";
    return `request received. we'll add ${name} within 24 hours.`;
  }

  if (sessionLoading || !account) return null;

  return (
    <div className={`${grotesk.variable} ${mono.variable}`} style={{ fontFamily: "var(--font-grotesk), sans-serif" }}>
      {error ? (
        <p className="p-8 font-[family-name:var(--font-mono-apply)] text-xs text-[#B03030]">{error}</p>
      ) : !data ? (
        <div className="min-h-screen bg-white p-6">
          <div className="h-40 animate-pulse bg-[#f5f5f5]" />
          <div className="mt-6 grid grid-cols-2 gap-px bg-[#0a0a0a] sm:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-36 animate-pulse bg-[#f5f5f5]" />
            ))}
          </div>
        </div>
      ) : (
        <BrandDashboard data={data} onRequestProduct={requestProduct} reports={reports} />
      )}
    </div>
  );
}
