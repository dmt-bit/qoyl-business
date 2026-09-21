"use client";

import { Fragment, useState } from "react";
import {
  approveApplication,
  approveFakeHairBrandApplication,
  rejectFakeHairBrandApplication,
  approveStylistApplication,
  updateBrandTier,
} from "./actions";

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

type BrandApplication = {
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

type BrandAccount = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  tier: string;
  status: string;
  created_at: string;
};

type FakeHairApplication = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string | null;
  instagram_handle: string | null;
  product_count: string | null;
  why_qoyl: string | null;
  tier: string | null;
  product_types: string[] | null;
  styles_served: string[] | null;
  status: string;
  created_at: string;
};

type FakeHairAccount = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  tier: string | null;
  status: string;
  created_at: string;
};

type SellerProduct = {
  id: string;
  brand_id: string;
  product_name: string;
  hair_type: string | null;
  in_stock: boolean | null;
};

type StylistApplication = {
  id: string;
  display_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  city: string;
  neighborhood: string | null;
  salon_name: string | null;
  instagram: string | null;
  years_experience: number | null;
  hair_types_served: string[] | null;
  why_qoyl: string | null;
  status: string;
  created_at: string;
};

type StylistAccount = {
  id: string;
  display_name: string;
  contact_name: string;
  email: string;
  city: string;
  status: string;
  created_at: string;
};

type TabKey =
  | "brand_applications"
  | "brand_accounts"
  | "hair_sellers"
  | "stylist_applications"
  | "stylist_accounts";

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
  brandApplications,
  brandAccounts,
  fakeHairApplications,
  fakeHairAccounts,
  stylistApplications,
  stylistAccounts,
  sellerProducts,
  password,
  initialTab,
  approvedEmail,
  approvalStatus,
  errorDetail,
}: {
  brandApplications: BrandApplication[];
  brandAccounts: BrandAccount[];
  fakeHairApplications: FakeHairApplication[];
  fakeHairAccounts: FakeHairAccount[];
  stylistApplications: StylistApplication[];
  stylistAccounts: StylistAccount[];
  sellerProducts: SellerProduct[];
  password: string;
  initialTab: TabKey;
  approvedEmail: string | null;
  approvalStatus: string | null;
  errorDetail: string | null;
}) {
  const [tab, setTab] = useState<TabKey>(initialTab);
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const [openCatalogId, setOpenCatalogId] = useState<string | null>(null);

  const activeSellers = fakeHairAccounts.filter((a) => ["approved", "active"].includes(a.status));
  const featuredCount = activeSellers.filter((a) => a.tier === "featured").length;
  const productsBySeller = new Map<string, SellerProduct[]>();
  for (const p of sellerProducts) {
    const list = productsBySeller.get(p.brand_id) ?? [];
    list.push(p);
    productsBySeller.set(p.brand_id, list);
  }

  const validStatus: ApprovalStatus | null =
    approvalStatus && approvalStatus in APPROVAL_BANNER_TONE
      ? (approvalStatus as ApprovalStatus)
      : null;

  const TABS: { key: TabKey; label: string }[] = [
    { key: "brand_applications", label: "Brand Applications" },
    { key: "brand_accounts", label: "Brand Accounts" },
    { key: "hair_sellers", label: "Hair Sellers" },
    { key: "stylist_applications", label: "Stylist Applications" },
    { key: "stylist_accounts", label: "Stylist Accounts" },
  ];

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

      <div className="mb-8 flex flex-wrap gap-2 border-b border-warm/10">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-3 text-sm uppercase tracking-wider transition-colors ${
              tab === t.key
                ? "border-b-2 border-bronze text-cream"
                : "text-muted hover:text-sand"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "brand_applications" && (
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
              {brandApplications.map((app) => (
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
              {brandApplications.length === 0 && (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-muted">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "brand_accounts" && (
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
              {brandAccounts.map((account) => (
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
              {brandAccounts.length === 0 && (
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

      {tab === "hair_sellers" && (
        <div className="space-y-10">
          <div className="grid gap-4 sm:grid-cols-3">
            {[
              { label: "Active sellers", value: activeSellers.length },
              { label: "Featured", value: featuredCount },
              { label: "Standard", value: activeSellers.length - featuredCount },
            ].map((stat) => (
              <div key={stat.label} className="rounded-lg border border-warm/10 bg-warm/[0.03] p-5">
                <p className="text-xs uppercase tracking-wider text-muted">{stat.label}</p>
                <p className="mt-2 font-serif text-3xl text-cream">{stat.value}</p>
              </div>
            ))}
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl text-cream">Applications</h2>
            <div className="overflow-x-auto rounded-lg border border-warm/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Contact</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Product types</th>
                    <th className="px-4 py-3">Styles served</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Applied</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {fakeHairApplications.map((app) => (
                    <tr key={app.id} className="border-t border-warm/10 align-top">
                      <td className="px-4 py-3 text-cream">{app.company_name}</td>
                      <td className="px-4 py-3 text-sand">
                        {app.contact_name}
                        <br />
                        <span className="text-xs text-muted">{app.email}</span>
                      </td>
                      <td className="px-4 py-3 text-sand">{app.tier ?? "standard"}</td>
                      <td className="px-4 py-3 text-sand max-w-xs">{app.product_types?.join(", ") || "—"}</td>
                      <td className="px-4 py-3 text-sand max-w-xs">{app.styles_served?.join(", ") || "—"}</td>
                      <td className={`px-4 py-3 font-medium ${STATUS_STYLES[app.status] ?? "text-muted"}`}>
                        {app.status}
                      </td>
                      <td className="px-4 py-3 text-muted whitespace-nowrap">
                        {new Date(app.created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {app.status === "pending" ? (
                          <div className="flex gap-2">
                            <form action={approveFakeHairBrandApplication}>
                              <input type="hidden" name="id" value={app.id} />
                              <input type="hidden" name="password" value={password} />
                              <button
                                type="submit"
                                className="rounded-full bg-bronze px-4 py-2 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
                              >
                                Approve
                              </button>
                            </form>
                            <form action={rejectFakeHairBrandApplication}>
                              <input type="hidden" name="id" value={app.id} />
                              <input type="hidden" name="password" value={password} />
                              <button
                                type="submit"
                                className="rounded-full border border-red/40 px-4 py-2 text-xs font-medium uppercase tracking-wider text-red transition-colors hover:bg-red/10"
                              >
                                Reject
                              </button>
                            </form>
                          </div>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                  {fakeHairApplications.length === 0 && (
                    <tr>
                      <td colSpan={8} className="px-4 py-8 text-center text-muted">
                        No applications yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div>
            <h2 className="mb-3 font-serif text-xl text-cream">Sellers</h2>
            <div className="overflow-x-auto rounded-lg border border-warm/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
                  <tr>
                    <th className="px-4 py-3">Brand</th>
                    <th className="px-4 py-3">Email</th>
                    <th className="px-4 py-3">Tier</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Products</th>
                    <th className="px-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {fakeHairAccounts.map((account) => {
                    const products = productsBySeller.get(account.id) ?? [];
                    const open = openCatalogId === account.id;
                    return (
                      <Fragment key={account.id}>
                        <tr className="border-t border-warm/10">
                          <td className="px-4 py-3 text-cream">{account.company_name}</td>
                          <td className="px-4 py-3 text-sand">{account.email}</td>
                          <td className="px-4 py-3">
                            <span
                              className={`rounded-full px-3 py-1 text-xs uppercase tracking-wider ${
                                account.tier === "featured"
                                  ? "bg-bronze text-dark"
                                  : "bg-warm/[0.06] text-muted"
                              }`}
                            >
                              {account.tier ?? "standard"}
                            </span>
                          </td>
                          <td className={`px-4 py-3 font-medium ${STATUS_STYLES[account.status] ?? "text-muted"}`}>
                            {account.status}
                          </td>
                          <td className="px-4 py-3 text-sand">{products.length}</td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => setOpenCatalogId(open ? null : account.id)}
                              className="text-xs uppercase tracking-wider text-bronze2 hover:text-bronze"
                            >
                              {open ? "Hide catalog" : "View catalog"}
                            </button>
                          </td>
                        </tr>
                        {open && (
                          <tr className="border-t border-warm/10 bg-warm/[0.02]">
                            <td colSpan={6} className="px-4 py-4">
                              {products.length === 0 ? (
                                <p className="text-sm text-muted">No products uploaded yet.</p>
                              ) : (
                                <ul className="space-y-1 text-sm text-sand">
                                  {products.map((p) => (
                                    <li key={p.id} className="flex flex-wrap gap-x-4">
                                      <span className="text-cream">{p.product_name}</span>
                                      <span className="text-muted">{p.hair_type ?? "—"}</span>
                                      <span className={p.in_stock === false ? "text-red" : "text-green"}>
                                        {p.in_stock === false ? "out of stock" : "in stock"}
                                      </span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
                  {fakeHairAccounts.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-4 py-8 text-center text-muted">
                        No hair sellers yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "stylist_applications" && (
        <div className="overflow-x-auto rounded-lg border border-warm/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Display name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Experience</th>
                <th className="px-4 py-3">Hair types served</th>
                <th className="px-4 py-3">Why Qoyl</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Applied</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {stylistApplications.map((app) => (
                <tr key={app.id} className="border-t border-warm/10 align-top">
                  <td className="px-4 py-3 text-cream">{app.display_name}</td>
                  <td className="px-4 py-3 text-sand">{app.contact_name}</td>
                  <td className="px-4 py-3 text-sand">{app.email}</td>
                  <td className="px-4 py-3 text-sand">
                    {app.city}
                    {app.neighborhood ? `, ${app.neighborhood}` : ""}
                  </td>
                  <td className="px-4 py-3 text-sand">
                    {app.years_experience != null ? `${app.years_experience} yrs` : "—"}
                  </td>
                  <td className="px-4 py-3 text-sand">
                    {app.hair_types_served?.join(", ") || "—"}
                  </td>
                  <td className="px-4 py-3 text-sand max-w-xs">{app.why_qoyl || "—"}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[app.status] ?? "text-muted"}`}>
                    {app.status}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(app.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    {app.status === "pending" ? (
                      <form action={approveStylistApplication}>
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
              {stylistApplications.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-muted">
                    No applications yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {tab === "stylist_accounts" && (
        <div className="overflow-x-auto rounded-lg border border-warm/10">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-warm/[0.04] text-muted uppercase text-xs tracking-wider">
              <tr>
                <th className="px-4 py-3">Display name</th>
                <th className="px-4 py-3">Contact</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">City</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Joined</th>
              </tr>
            </thead>
            <tbody>
              {stylistAccounts.map((account) => (
                <tr key={account.id} className="border-t border-warm/10">
                  <td className="px-4 py-3 text-cream">{account.display_name}</td>
                  <td className="px-4 py-3 text-sand">{account.contact_name}</td>
                  <td className="px-4 py-3 text-sand">{account.email}</td>
                  <td className="px-4 py-3 text-sand">{account.city}</td>
                  <td className={`px-4 py-3 font-medium ${STATUS_STYLES[account.status] ?? "text-muted"}`}>
                    {account.status}
                  </td>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(account.created_at).toLocaleDateString()}
                  </td>
                </tr>
              ))}
              {stylistAccounts.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted">
                    No stylist accounts yet.
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
