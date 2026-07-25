"use client";

import { useState } from "react";
import { approveApplication, updateBrandTier } from "./actions";

const STATUS_STYLES: Record<string, string> = {
  pending: "text-bronze2",
  approved: "text-green",
  rejected: "text-red",
  active: "text-green",
  suspended: "text-red",
};

const TIERS = [
  { value: "early_stage", label: "Early Stage" },
  { value: "growth", label: "Growth" },
  { value: "enterprise", label: "Enterprise" },
];

type Application = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string | null;
  instagram_handle: string | null;
  product_count: string | null;
  annual_revenue: string | null;
  why_qoyl: string | null;
  status: string;
  created_at: string;
};

type Account = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
};

type ApprovalStatus = "ok" | "email_failed" | "auth_failed" | "account_failed" | "not_found";

const APPROVAL_BANNER_TONE: Record<ApprovalStatus, "good" | "warn" | "bad"> = {
  ok: "good",
  email_failed: "warn",
  auth_failed: "warn",
  account_failed: "bad",
  not_found: "bad",
};

const BANNER_TONE_CLASSES: Record<"good" | "warn" | "bad", string> = {
  good: "border-green/30 bg-green/10 text-green",
  warn: "border-amber/30 bg-amber/10 text-amber",
  bad: "border-red/30 bg-red/10 text-red",
};

function approvalMessage(
  status: ApprovalStatus,
  email: string | null,
  errorDetail: string | null
): string {
  switch (status) {
    case "ok":
      return `Approved successfully — login credentials sent to ${email}`;
    case "email_failed":
      return `Approved but email failed — send credentials manually to ${email}.${
        errorDetail ? ` (${errorDetail})` : ""
      }`;
    case "auth_failed":
      return `Approved, but creating their login failed${
        errorDetail ? ` (${errorDetail})` : ""
      } — create it manually in Supabase Auth for ${email}.`;
    case "account_failed":
      return `Something went wrong saving the approval${email ? ` for ${email}` : ""}${
        errorDetail ? ` (${errorDetail})` : ""
      }. Check the server logs and retry.`;
    case "not_found":
      return "Couldn't find that application — it may have already been processed.";
  }
}

export default function AdminTabs({
  applications,
  accounts,
  password,
  initialTab,
  approvedEmail,
  approvalStatus,
  errorDetail,
}: {
  applications: Application[];
  accounts: Account[];
  password: string;
  initialTab: "applications" | "accounts";
  approvedEmail: string | null;
  approvalStatus: string | null;
  errorDetail: string | null;
}) {
  const [tab, setTab] = useState<"applications" | "accounts">(initialTab);
  const [bannerDismissed, setBannerDismissed] = useState(false);

  const validStatus: ApprovalStatus | null =
    approvalStatus && approvalStatus in APPROVAL_BANNER_TONE
      ? (approvalStatus as ApprovalStatus)
      : null;

  return (
    <div>
      {validStatus && !bannerDismissed && (
        <div
          className={`mb-6 flex items-center justify-between rounded-md border px-4 py-3 text-sm ${BANNER_TONE_CLASSES[APPROVAL_BANNER_TONE[validStatus]]}`}
        >
          <span>{approvalMessage(validStatus, approvedEmail, errorDetail)}</span>
          <button
            onClick={() => setBannerDismissed(true)}
            className="ml-4 shrink-0 text-xs uppercase tracking-wider text-muted hover:text-cream"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="mb-8 flex gap-2 border-b border-warm/10">
        <button
          onClick={() => setTab("applications")}
          className={`px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
            tab === "applications"
              ? "border-b-2 border-bronze text-cream"
              : "text-muted hover:text-sand"
          }`}
        >
          Applications
        </button>
        <button
          onClick={() => setTab("accounts")}
          className={`px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
            tab === "accounts"
              ? "border-b-2 border-bronze text-cream"
              : "text-muted hover:text-sand"
          }`}
        >
          Brand Accounts
        </button>
      </div>

      {tab === "applications" ? (
        <div className="overflow-x-auto rounded-lg border border-warm/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Website</th>
                <th className="px-4 py-3">Instagram</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Revenue</th>
                <th className="px-4 py-3">Why Qoyl</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {applications.map((app) => (
                <tr key={app.id} className="border-t border-warm/10 align-top">
                  <td className="px-4 py-3 text-cream">{app.company_name}</td>
                  <td className="px-4 py-3 text-sand">{app.contact_name}</td>
                  <td className="px-4 py-3 text-sand">{app.email}</td>
                  <td className="px-4 py-3 text-sand">{app.website || "—"}</td>
                  <td className="px-4 py-3 text-sand">{app.instagram_handle || "—"}</td>
                  <td className="px-4 py-3 text-sand">{app.product_count || "—"}</td>
                  <td className="px-4 py-3 text-sand">{app.annual_revenue || "—"}</td>
                  <td className="px-4 py-3 text-sand max-w-xs">{app.why_qoyl || "—"}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[app.status] ?? "text-muted"}`}>
                    {app.status}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {app.status === "pending" ? (
                      <form action={approveApplication}>
                        <input type="hidden" name="id" value={app.id} />
                        <input type="hidden" name="password" value={password} />
                        <button
                          type="submit"
                          className="rounded-full bg-bronze px-4 py-2 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
                        >
                          Approve
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-warm/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Company</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
                <th className="px-4 py-3">Tier</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map((account) => (
                <tr key={account.id} className="border-t border-warm/10">
                  <td className="px-4 py-3 text-cream">{account.company_name}</td>
                  <td className="px-4 py-3 text-sand">{account.contact_name}</td>
                  <td className="px-4 py-3 text-sand">{account.email}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[account.status] ?? "text-muted"}`}>
                    {account.status}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-1">
                      {TIERS.map((t) => (
                        <form key={t.value} action={updateBrandTier}>
                          <input type="hidden" name="id" value={account.id} />
                          <input type="hidden" name="password" value={password} />
                          <input type="hidden" name="tier" value={t.value} />
                          <button
                            type="submit"
                            disabled={account.tier === t.value}
                            className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                              account.tier === t.value
                                ? "bg-bronze text-dark"
                                : "bg-warm/[0.05] text-muted hover:bg-warm/10 hover:text-sand"
                            }`}
                          >
                            {t.label}
                          </button>
                        </form>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
              {accounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No brand accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
