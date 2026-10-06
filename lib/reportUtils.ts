export const REPORT_TYPES = ["reformulation", "segment_targeting", "competitive", "trend_signals"] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

const TYPE_LABELS: Record<ReportType, string> = {
  reformulation: "reformulation report",
  segment_targeting: "segment targeting report",
  competitive: "competitive positioning report",
  trend_signals: "trend signals report",
};

const SHORT_LABELS: Record<ReportType, string> = {
  reformulation: "reformulation",
  segment_targeting: "segment targeting",
  competitive: "competitive",
  trend_signals: "trend signals",
};

export function generateReportTitle(reportType: ReportType, productName: string, month: Date): string {
  const monthName = month.toLocaleDateString("en-US", { month: "long", year: "numeric" }).toLowerCase();
  return `${TYPE_LABELS[reportType]} · ${productName.toLowerCase()} · ${monthName}`;
}

export function getReportTypeLabel(type: string): string {
  return SHORT_LABELS[type as ReportType] ?? type;
}

// First day of the month, as the YYYY-MM-01 string the report_month column takes.
export function reportMonthStart(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export function monthName(reportMonth: string): string {
  const [y, m] = reportMonth.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString("en-US", { month: "long", timeZone: "UTC" }).toLowerCase();
}
