"use client";

// Renders report content generically (see reportBodyHtml in lib/emailTemplates.ts
// for the email version). Used by the brand dashboard and the admin review.
const lc = (str: string | null | undefined): string => str?.toLowerCase() ?? "";
const MONO = "font-[family-name:var(--font-mono-apply)]";
const GROTESK = "font-[family-name:var(--font-grotesk)]";

export default function ReportBody({ content }: { content: Record<string, unknown> }) {
  return (
    <div>
      {Object.entries(content).map(([key, value]) => {
        if (value === null || value === undefined || value === "") return null;
        if (key === "executive_summary") {
          return (
            <p key={key} className={`${GROTESK} mb-5 text-[14px] font-normal leading-[1.85] text-[#444]`}>
              {lc(String(value))}
            </p>
          );
        }
        return (
          <div key={key} className="mb-4">
            <p className={`${MONO} mb-2 text-[9px] lowercase tracking-[0.12em] text-[#888]`}>{lc(key.replace(/_/g, " "))}</p>
            {typeof value === "string" && <p className={`${GROTESK} text-[13px] font-light leading-[1.75] text-[#444]`}>{lc(value)}</p>}
            {Array.isArray(value) && value.every((v) => typeof v === "string") && (
              <ul className={`${GROTESK} list-none space-y-1 text-[13px] font-light leading-[1.75] text-[#444]`}>
                {(value as string[]).map((v, i) => (
                  <li key={i}>→ {lc(v)}</li>
                ))}
              </ul>
            )}
            {Array.isArray(value) &&
              !value.every((v) => typeof v === "string") &&
              (value as Record<string, unknown>[]).map((item, i) => (
                <div key={i} className="mb-3 border border-[#e8e8e8] p-4">
                  {Object.entries(item)
                    .filter(([, v]) => v !== null && v !== undefined && v !== "")
                    .map(([k, v]) => (
                      <div key={k} className="mb-1">
                        <span className={`${MONO} text-[9px] lowercase text-[#888]`}>{lc(k.replace(/_/g, " "))}</span>
                        <p className={`${GROTESK} text-[13px] font-light leading-[1.7] text-[#0a0a0a]`}>{lc(String(v))}</p>
                      </div>
                    ))}
                </div>
              ))}
          </div>
        );
      })}
    </div>
  );
}
