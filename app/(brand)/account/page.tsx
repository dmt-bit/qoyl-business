"use client";

import { useBrandSession } from "@/lib/brandSession";

const TIER_LABELS: Record<string, string> = {
  early_stage: "Early Stage",
  growth: "Growth",
  enterprise: "Enterprise",
};

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-t border-warm/10 py-4 first:border-t-0">
      <span className="text-sm text-muted">{label}</span>
      <span className="text-sm text-cream">{value}</span>
    </div>
  );
}

export default function AccountPage() {
  const { loading, account } = useBrandSession();

  if (loading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-3xl text-cream">Account</h1>

        <div className="mt-10 rounded-lg border border-warm/10 bg-warm/[0.03] px-6">
          <Row label="Company" value={account.company_name} />
          <Row label="Contact" value={account.contact_name} />
          <Row label="Email" value={account.email} />
          <Row label="Website" value={account.website || "—"} />
          <Row label="Instagram" value={account.instagram_handle || "—"} />
          <Row label="Tier" value={TIER_LABELS[account.tier] ?? account.tier} />
          <Row label="Status" value={account.status} />
          <Row
            label="Member since"
            value={new Date(account.created_at).toLocaleDateString()}
          />
        </div>
      </div>
    </div>
  );
}
