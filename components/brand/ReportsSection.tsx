"use client";

import Link from "next/link";
import { useState } from "react";
import ReportBody from "./ReportBody";
import { getReportTypeLabel } from "@/lib/reportUtils";

export type SentReport = {
  id: string;
  report_type: string;
  report_month: string;
  title: string;
  summary: string | null;
  content: Record<string, unknown>;
  sent_at: string | null;
  product_name: string | null;
};

const MONO = "font-[family-name:var(--font-mono-apply)]";
const GROTESK = "font-[family-name:var(--font-grotesk)]";

function monthLabel(reportMonth: string): string {
  const [y, m] = reportMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", year: "numeric", timeZone: "UTC" }).toLowerCase();
}

function nextFirstOfMonth(): string {
  const now = new Date();
  const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
  return first.toLocaleDateString("en-US", { month: "long", day: "numeric", timeZone: "UTC" }).toLowerCase();
}

export default function ReportsSection({ surveyCompleted, reports }: { surveyCompleted: boolean; reports: SentReport[] }) {
  const [open, setOpen] = useState<string | null>(null);

  return (
    <section className="pt-8">
      <p className={`${MONO} text-[9px] lowercase tracking-[0.12em] text-[#888]`}>07 · r&amp;d reports</p>
      <h2 className={`${GROTESK} mt-2 text-[22px] font-bold lowercase tracking-[-0.8px]`}>your monthly intelligence reports</h2>
      <p className={`${GROTESK} mb-6 mt-1 text-[13px] font-light text-[#888]`}>generated monthly based on your preferences · reviewed before sending</p>

      {!surveyCompleted ? (
        <div>
          <p className={`${GROTESK} mb-4 text-sm font-light text-[#888]`}>set your report preferences to start receiving monthly intelligence.</p>
          <Link href="/report-preferences" className={`${MONO} inline-block bg-[#0a0a0a] px-5 py-3 text-[10px] lowercase text-white`}>
            set preferences — takes 2 minutes →
          </Link>
        </div>
      ) : reports.length === 0 ? (
        <div>
          <p className={`${GROTESK} mb-4 text-sm font-light text-[#888]`}>your first report generates on the 1st of {nextFirstOfMonth()}.</p>
          <Link href="/report-preferences" className={`${MONO} inline-block border border-[#0a0a0a] px-5 py-3 text-[10px] lowercase`}>
            set report preferences →
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {reports.map((r) => {
            const expanded = open === r.id;
            return (
              <div key={r.id} className="border border-[#e8e8e8] p-5">
                <button type="button" onClick={() => setOpen(expanded ? null : r.id)} className="flex w-full items-center justify-between text-left">
                  <span className="flex flex-wrap items-center gap-3">
                    <span className={`${MONO} bg-black px-3 py-1 text-[9px] lowercase text-white`}>{getReportTypeLabel(r.report_type)}</span>
                    <span className={`${MONO} text-[10px] lowercase text-[#888]`}>{monthLabel(r.report_month)}</span>
                    {r.product_name && <span className={`${GROTESK} text-sm lowercase`}>{r.product_name.toLowerCase()}</span>}
                  </span>
                  <span className={`${MONO} text-[9px] lowercase text-[#888]`}>{expanded ? "collapse ↑" : "expand →"}</span>
                </button>
                {expanded && (
                  <div className="mt-6">
                    <ReportBody content={r.content} />
                    <p className={`${MONO} mt-6 text-[9px] lowercase text-[#aaa]`}>
                      questions about this report? reply to the email we sent or contact hey@qoyl.live
                    </p>
                  </div>
                )}
              </div>
            );
          })}
          <Link href="/report-preferences" className={`${MONO} mt-4 inline-block text-[10px] lowercase text-[#888] underline`}>
            update your report preferences →
          </Link>
        </div>
      )}
    </section>
  );
}
