"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useStylistSession } from "@/lib/stylistSession";
import { getStylistDashboardData, type StylistDashboardData } from "@/lib/stylistData";
import { findMatchingService, type StructuredService } from "@/lib/stylistServices";

// Design note: this spec was written in Qoyl's consumer-app palette (white
// cards, Space Mono labels, #0a0a0a text). This dashboard lives inside the
// existing dark-themed shell every other stylist/brand page uses (warm/
// bronze/cream tokens, DM Sans + Cormorant, no mono font loaded) - the
// layout, copy, and behavior below match the spec; the colors and type
// don't, on purpose, so this doesn't look broken next to the sidebar.

// A person's actual name is never force-lowercased (unlike this page's
// static labels) - that would mangle real names.
function deriveBookingPlatform(url: string | null): string | null {
  if (!url) return null;
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    if (host.includes("calendly")) return "Calendly";
    if (host.includes("acuityscheduling") || host.includes("squarespacescheduling")) return "Acuity";
    if (host.includes("vagaro")) return "Vagaro";
    if (host.includes("styleseat")) return "StyleSeat";
    if (host.includes("square.site") || host.includes("squareup")) return "Square";
    if (host.includes("instagram")) return "Instagram DM";
    if (host.includes("booksy")) return "Booksy";
    return host;
  } catch {
    return null;
  }
}

function ToggleSwitch({ on, onChange, disabled }: { on: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onChange}
      className="relative h-11 w-[72px] shrink-0 rounded-full transition-colors disabled:opacity-50"
      style={{ background: on ? "#1C1612" : "#3A332C" }}
    >
      <span
        className="absolute top-1 h-9 w-9 rounded-full bg-cream transition-transform"
        style={{ transform: on ? "translateX(34px)" : "translateX(4px)" }}
      />
    </button>
  );
}

function StatCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg border border-warm/10 bg-warm/[0.03] p-4">
      <p className="font-mono text-[28px] font-bold leading-none text-cream">{value}</p>
      <p className="mt-2 text-[10px] uppercase tracking-wider text-muted">{label}</p>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="mb-3 text-xs uppercase tracking-wider text-bronze2">{children}</p>;
}

export default function StylistDashboardPage() {
  const { loading: sessionLoading, session, account } = useStylistSession();
  const [data, setData] = useState<StylistDashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  const [accepting, setAccepting] = useState<boolean>(true);
  const [toggling, setToggling] = useState(false);
  useEffect(() => {
    if (account) setAccepting(account.accepting_new_clients);
  }, [account]);

  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    getStylistDashboardData(session.access_token).then((result) => {
      if (!cancelled) {
        setData(result);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  async function toggleAccepting() {
    if (!account || !session) return;
    const next = !accepting;
    setAccepting(next); // optimistic
    setToggling(true);
    try {
      const res = await fetch(`/api/stylist/${account.id}/availability`, {
        method: "PATCH",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ accepting_new_clients: next }),
      });
      if (!res.ok) throw new Error("failed");
    } catch {
      setAccepting(!next); // revert on failure
    } finally {
      setToggling(false);
    }
  }

  function copyBookingLink() {
    if (!account?.booking_url) return;
    navigator.clipboard.writeText(account.booking_url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (sessionLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const platform = deriveBookingPlatform(account.booking_url);
  const services: StructuredService[] = Array.isArray(account.services_structured)
    ? (account.services_structured as StructuredService[])
    : [];
  const previewStyle = data?.topMatchedStyle ? findMatchingService(services, data.topMatchedStyle) : null;
  const previewService = previewStyle ?? services[0] ?? null;

  const allZero =
    !!data &&
    data.matchesThisMonthCount === 0 &&
    data.totalMatchCount === 0 &&
    data.bookingLinkTaps === 0 &&
    !data.topMatchedStyle;

  const topDemandStyle = data?.monthlyDemand[0] ?? null;

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        {/* Header */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="font-serif text-3xl sm:text-4xl text-cream">{account.display_name}</h1>
            <p className="mt-1 text-xs uppercase tracking-wider text-muted">
              {account.city}
              {platform ? ` · ${platform}` : ""}
            </p>
          </div>
          <span className="shrink-0 rounded-full bg-cream px-3 py-1 text-[11px] uppercase tracking-wider text-dark">
            stylist listing · $35/month
          </span>
        </div>

        {/* Section 1 - accepting new clients */}
        <div className="mt-8 flex items-center justify-between gap-4 rounded-lg border border-warm/20 p-5">
          <div>
            <p className="text-base font-semibold lowercase text-cream">accepting new clients</p>
            <p className={`mt-1 text-[11px] uppercase tracking-wider ${accepting ? "text-green" : "text-muted"}`}>
              {accepting
                ? "you're appearing in style match results"
                : "you're hidden from style match results - your subscription continues"}
            </p>
          </div>
          <ToggleSwitch on={accepting} onChange={toggleAccepting} disabled={toggling} />
        </div>

        {/* Section 2 - booking link */}
        <div className="mt-10">
          <SectionLabel>your booking link</SectionLabel>
          {account.booking_url ? (
            <>
              <div className="flex items-stretch gap-2">
                <input
                  readOnly
                  value={account.booking_url}
                  className="min-w-0 flex-1 rounded-md border border-warm/15 bg-transparent px-3.5 py-2.5 font-mono text-xs text-cream"
                />
                <button
                  type="button"
                  onClick={copyBookingLink}
                  className="shrink-0 rounded-md bg-bronze px-4 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
                >
                  {copied ? "copied ✓" : "copy link"}
                </button>
              </div>
              <p className="mt-2 text-[10px] text-muted">this is the link qoyl sends clients directly to</p>
            </>
          ) : (
            <p className="text-sm text-muted">
              No booking link on file yet -{" "}
              <Link href="/stylist/account" className="text-bronze2 underline underline-offset-2 hover:text-bronze">
                add one in your account
              </Link>
              .
            </p>
          )}
        </div>

        {/* Section 3 - match stats */}
        <div className="mt-10">
          <SectionLabel>match stats</SectionLabel>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : allZero ? (
            <p className="text-sm font-light text-muted">
              your first match will appear here when a client finds a style in your specialty
            </p>
          ) : (
            <div className="grid grid-cols-2 gap-3">
              <StatCard label="matches this month" value={data?.matchesThisMonthCount ?? 0} />
              <StatCard label="total matches all time" value={data?.totalMatchCount ?? 0} />
              <StatCard label="booking link taps" value={data?.bookingLinkTaps ?? 0} />
              <StatCard label="styles matched" value={data?.topMatchedStyle ?? "-"} />
            </div>
          )}
        </div>

        {/* Section 4 - recent matches */}
        <div className="mt-10">
          <SectionLabel>recent matches</SectionLabel>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : !data || data.recentMatches.length === 0 ? (
            <p className="text-sm font-light text-muted">
              no matches yet - your profile is live and you&apos;ll be notified when a client matches a style in your
              specialty
            </p>
          ) : (
            <div className="space-y-2">
              {data.recentMatches.map((m) => (
                <div
                  key={m.id}
                  className="rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm font-light text-sand"
                >
                  {m.style.toLowerCase()}
                  {m.curlType ? ` · ${m.curlType}` : ""}
                  {m.porosity ? ` · ${m.porosity} porosity` : ""}
                  {" · "}
                  {new Date(m.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }).toLowerCase()}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 5 - your listed services */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <SectionLabel>your listed services</SectionLabel>
            <Link href="/stylist/account" className="mb-3 text-[10px] uppercase tracking-wider text-muted hover:text-cream">
              edit services →
            </Link>
          </div>
          {services.length === 0 ? (
            <p className="text-sm text-muted">No services listed yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {services.map((s, i) => (
                <div key={`${s.name}-${i}`} className="rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm">
                  <p className="text-cream">{s.name}</p>
                  <p className="mt-1 text-xs text-muted">
                    {s.price_min != null && s.price_max != null ? `$${s.price_min}-${s.price_max}` : "price not listed"}
                    {s.duration_min != null && s.duration_max != null ? ` · ${s.duration_min}-${s.duration_max} hrs` : ""}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 6 - hair types you serve */}
        <div className="mt-10">
          <div className="flex items-center justify-between">
            <SectionLabel>hair types you serve</SectionLabel>
            <Link href="/stylist/account" className="mb-3 text-[10px] uppercase tracking-wider text-muted hover:text-cream">
              edit profile →
            </Link>
          </div>
          {(account.hair_types_served ?? []).length === 0 ? (
            <p className="text-sm text-muted">No hair types listed yet.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {(account.hair_types_served ?? []).map((t) => (
                <span key={t} className="rounded-full border border-warm/15 px-3 py-1 font-mono text-[11px] text-cream">
                  {t}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Section 7 - what clients see */}
        <div className="mt-10">
          <SectionLabel>what clients see when they match with you</SectionLabel>
          <div className="rounded-lg border border-warm/15 bg-warm/[0.03] p-5">
            <p className="font-serif text-lg text-cream">
              {account.display_name} — {account.city}
            </p>
            {services.length > 0 && (
              <p className="mt-1 text-xs text-muted">{services.slice(0, 3).map((s) => s.name).join(" · ")}</p>
            )}
            {account.instagram && (
              <a
                href={`https://instagram.com/${account.instagram.replace(/^@/, "")}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-1 inline-block text-xs text-bronze2 hover:text-bronze"
              >
                @{account.instagram.replace(/^@/, "")} →
              </a>
            )}
            {account.bio && <p className="mt-2 text-xs italic text-sand">{account.bio}</p>}

            {previewService ? (
              <div className="mt-4 border-t border-warm/10 pt-4">
                <p className="text-sm text-cream">
                  {previewService.name} with {account.display_name}
                </p>
                {previewService.price_min != null && previewService.price_max != null && (
                  <p className="mt-1 text-xs text-muted">
                    Price: ${previewService.price_min}-{previewService.price_max}
                  </p>
                )}
                {previewService.duration_min != null && previewService.duration_max != null && (
                  <p className="text-xs text-muted">
                    Time: {previewService.duration_min}-{previewService.duration_max} hours
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-4 border-t border-warm/10 pt-4 text-xs text-muted">
                Add a priced service to see its preview here.
              </p>
            )}

            {account.booking_url && (
              <a
                href={account.booking_url}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-block rounded-full bg-bronze px-5 py-2.5 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
              >
                Book with {account.display_name} →
              </a>
            )}
          </div>
          <p className="mt-2 text-[9px] text-muted">this is the card clients tap to book with you</p>
        </div>

        {/* Existing section, kept: broader city demand, not limited to this
            stylist's own matches - different signal from Section 3/4 above. */}
        {data && data.monthlyDemand.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl text-cream mb-4">
              This month&apos;s demand by style in {account.city}
            </h2>
            {topDemandStyle && (
              <p className="mb-3 text-xs text-muted">
                {data.monthlyMatchCount} user{data.monthlyMatchCount === 1 ? "" : "s"} matched a style you serve this
                month.
              </p>
            )}
            <ol className="space-y-2">
              {data.monthlyDemand.map((d, i) => (
                <li
                  key={d.style}
                  className="flex items-center justify-between rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                >
                  <span className="text-sand">
                    <span className="text-muted mr-2">{i + 1}.</span>
                    {d.style}
                  </span>
                  <span className="text-bronze2">{d.count}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        {/* Existing section, kept: the only reply channel until an in-app inbox exists. */}
        <section className="mt-10 mb-8">
          <h2 className="font-serif text-xl text-cream mb-1">Booking inquiries</h2>
          <p className="mb-4 text-xs text-muted">
            Consumers who chose you after a style match. Reply directly by email — no in-app inbox yet.
          </p>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : !data || data.bookingInquiries.length === 0 ? (
            <p className="text-sm text-muted">
              No booking inquiries yet — they&apos;ll show up here as consumers pick you after a Style Match.
            </p>
          ) : (
            <div className="space-y-2">
              {data.bookingInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-cream">{inquiry.detectedStyle}</p>
                    <p className="text-xs text-muted">
                      {new Date(inquiry.createdAt).toLocaleDateString()} ·{" "}
                      {inquiry.followedThrough ? "Followed through" : "Pending"}
                    </p>
                  </div>
                  {inquiry.consumerEmail && (
                    <a
                      href={`mailto:${inquiry.consumerEmail}`}
                      className="rounded-full bg-bronze px-4 py-2 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
                    >
                      Reply by email
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
