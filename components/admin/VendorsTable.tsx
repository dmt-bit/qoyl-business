"use client";

import { Fragment, useState } from "react";
import { approveVendorProfile } from "@/app/admin/actions";

export type VendorProfile = {
  id: string;
  user_email: string;
  plan_type: "stylist" | "hair-seller" | "brand";
  business_name: string | null;
  location: string | null;
  profile_data: Record<string, unknown>;
  stripe_customer_id: string | null;
  status: "pending_review" | "active" | "rejected";
  created_at: string;
};

const PLAN_LABELS: Record<VendorProfile["plan_type"], string> = {
  stylist: "stylist",
  "hair-seller": "hair-seller",
  brand: "brand",
};

const FILTERS: { key: "all" | VendorProfile["plan_type"]; label: string }[] = [
  { key: "all", label: "all" },
  { key: "stylist", label: "stylist" },
  { key: "hair-seller", label: "hair seller" },
  { key: "brand", label: "brand" },
];

const STATUS_COLOR: Record<VendorProfile["status"], string> = {
  pending_review: "#C4831A",
  active: "#2D7A3D",
  rejected: "#B03030",
};

function PlanBadge({ plan }: { plan: VendorProfile["plan_type"] }) {
  const filled = plan === "stylist";
  return (
    <span
      className={`inline-block px-2 py-0.5 font-mono text-[8px] lowercase ${
        filled ? "bg-[#0a0a0a] text-white" : "border border-[#0a0a0a] text-[#0a0a0a]"
      }`}
    >
      {PLAN_LABELS[plan]}
    </span>
  );
}

function StatusPill({ status }: { status: VendorProfile["status"] }) {
  const color = STATUS_COLOR[status];
  return (
    <span className="inline-block px-2 py-0.5 font-mono text-[8px] lowercase" style={{ border: `1px solid ${color}`, color }}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function ProfileDataList({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0));
  if (entries.length === 0) return <p className="text-xs text-[#888]">No additional profile details submitted.</p>;
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-2 sm:grid-cols-2">
      {entries.map(([key, value]) => (
        <div key={key}>
          <dt className="font-mono text-[9px] lowercase tracking-[0.06em] text-[#888]">{key.replace(/_/g, " ")}</dt>
          <dd className="mt-0.5 text-sm text-[#0a0a0a]">{Array.isArray(value) ? value.join(", ") : String(value)}</dd>
        </div>
      ))}
    </dl>
  );
}

export default function VendorsTable({ vendors, password }: { vendors: VendorProfile[]; password: string }) {
  const [filter, setFilter] = useState<"all" | VendorProfile["plan_type"]>("all");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered = filter === "all" ? vendors : vendors.filter((v) => v.plan_type === filter);

  const stats = {
    total: vendors.length,
    pending: vendors.filter((v) => v.status === "pending_review").length,
    active: vendors.filter((v) => v.status === "active").length,
  };

  return (
    <div>
      {/* STAT ROW */}
      <div className="mb-8 grid grid-cols-3 gap-px border border-[#0a0a0a] bg-[#0a0a0a]">
        {[
          { label: "total vendors", value: stats.total },
          { label: "pending review", value: stats.pending },
          { label: "active", value: stats.active },
        ].map((stat) => (
          <div key={stat.label} className="bg-white px-4 py-3">
            <p className="font-mono text-[9px] lowercase tracking-[0.06em] text-[#888]">{stat.label}</p>
            <p className="mt-1 font-mono text-2xl font-bold text-[#0a0a0a]">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* FILTER ROW */}
      <div className="mb-6 flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.key}
            type="button"
            onClick={() => setFilter(f.key)}
            className={`border border-[#0a0a0a] px-4 py-1.5 text-xs lowercase transition-colors ${
              filter === f.key ? "bg-[#0a0a0a] text-white" : "bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* TABLE */}
      <div className="overflow-x-auto border border-[#0a0a0a]">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-[#0a0a0a] bg-[#f5f5f5] font-mono text-[9px] uppercase tracking-wider text-[#888]">
            <tr>
              <th className="px-4 py-3">business name</th>
              <th className="px-4 py-3">plan</th>
              <th className="px-4 py-3">location</th>
              <th className="px-4 py-3">status</th>
              <th className="px-4 py-3">signed up</th>
              <th className="px-4 py-3">stripe customer</th>
              <th className="px-4 py-3">actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((vendor) => {
              const isOpen = expanded === vendor.id;
              return (
                <Fragment key={vendor.id}>
                  <tr className="border-t border-[#e8e8e8]">
                    <td className="px-4 py-3 font-bold lowercase text-[#0a0a0a]">{vendor.business_name || "—"}</td>
                    <td className="px-4 py-3">
                      <PlanBadge plan={vendor.plan_type} />
                    </td>
                    <td className="px-4 py-3 text-[#444]">{vendor.location || "—"}</td>
                    <td className="px-4 py-3">
                      <StatusPill status={vendor.status} />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#666]">
                      {new Date(vendor.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-[#aaa]">
                      {vendor.stripe_customer_id ? `${vendor.stripe_customer_id.slice(0, 12)}…` : "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-3">
                        {vendor.status !== "active" && (
                          <form action={approveVendorProfile}>
                            <input type="hidden" name="id" value={vendor.id} />
                            <input type="hidden" name="password" value={password} />
                            <button type="submit" className="text-xs text-[#2D7A3D] underline">
                              approve
                            </button>
                          </form>
                        )}
                        <button
                          type="button"
                          onClick={() => setExpanded(isOpen ? null : vendor.id)}
                          className="text-xs text-[#0a0a0a] underline"
                        >
                          {isOpen ? "close" : "view"}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-t border-[#e8e8e8] bg-[#fafafa]">
                      <td colSpan={7} className="px-4 py-4">
                        <p className="mb-2 font-mono text-[9px] lowercase tracking-[0.06em] text-[#888]">
                          contact: {vendor.user_email}
                        </p>
                        <ProfileDataList data={vendor.profile_data} />
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[#888]">
                  No vendors in this filter yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
