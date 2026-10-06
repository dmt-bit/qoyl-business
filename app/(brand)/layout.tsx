"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { BrandSessionProvider, useBrandSession, type BrandAccount } from "@/lib/brandSession";
import { grotesk, mono as monoFont } from "@/lib/brandFonts";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/dashboard", label: "My Products", icon: BoxIcon },
  { href: "/insights", label: "Market Insights", icon: ChartIcon },
  { href: "/account", label: "Account", icon: UserIcon },
];

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <BrandSessionProvider>
      <BrandGate>{children}</BrandGate>
    </BrandSessionProvider>
  );
}

// Dashboard access follows brand_accounts.status: only 'active' (set by the
// Stripe webhook once payment clears) sees the pages. Everything else gets a
// focused status page instead -- no sidebar, nothing is deleted.
function BrandGate({ children }: { children: ReactNode }) {
  const { loading, session, account } = useBrandSession();
  const heartbeatSent = useRef(false);
  const active = account?.status === "active";

  // Records dashboard_last_viewed_at once per page load for paid accounts.
  // Best-effort - a failure here never blocks the dashboard.
  useEffect(() => {
    if (!active || !session || heartbeatSent.current) return;
    heartbeatSent.current = true;
    fetch("/api/brand/heartbeat", {
      method: "POST",
      headers: { Authorization: `Bearer ${session.access_token}` },
    }).catch(() => {});
  }, [active, session]);

  if (loading || !account) return null;

  if (active) {
    return (
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    );
  }

  if (account.status === "cancelled") return <StatusPage kind="cancelled" account={account} />;
  return <StatusPage kind="pending_payment" account={account} />;
}

const PENDING_FEATURES = [
  "product scores across 6 representative hair profiles",
  "segment breakdown — which curl types and porosity levels your formula wins with",
  "ingredient flags with reformulation recommendations",
  "geographic demand — which cities are searching your products",
  "style match placement tracking",
];

function StatusPage({ kind, account }: { kind: "pending_payment" | "cancelled"; account: BrandAccount }) {
  const mono = "font-[family-name:var(--font-mono-apply)]";
  const cancelled = kind === "cancelled";
  const cents = account.plan_price_cents ?? null;
  const price = cents ? `$${Math.round(cents / 100)}` : null;

  return (
    <div className={`${grotesk.variable} ${monoFont.variable} min-h-screen bg-white px-6 py-16 text-[#0a0a0a]`}>
      <div className="mx-auto max-w-[400px]">
        <p className={`${mono} text-[10px] lowercase tracking-[0.12em] text-[#888]`}>
          {cancelled ? "subscription ended" : "pending payment"}
        </p>
        <h1 className="mt-3 text-[28px] font-bold lowercase leading-tight tracking-[-1px]">
          {cancelled ? "your dashboard access is paused." : "one step away."}
        </h1>
        <p className="mt-2 text-sm font-light text-[#666]">
          {cancelled
            ? `your subscription for ${account.company_name} has ended. your data is kept — reply to hey@qoyl.live and we'll set you back up.`
            : `complete your payment to unlock your ${account.company_name} brand dashboard.`}
        </p>

        {!cancelled && (
          <div className="mt-8">
            {account.payment_url ? (
              <a
                href={account.payment_url}
                className="block w-full bg-[#0a0a0a] px-6 py-4 text-center text-sm font-semibold lowercase tracking-[0.02em] text-white hover:opacity-80"
              >
                complete setup{price ? ` — ${price}/month` : ""} →
              </a>
            ) : (
              <p className="border border-[#0a0a0a] px-4 py-3 text-sm">
                we couldn&apos;t find your payment link. email hey@qoyl.live and we&apos;ll send it over.
              </p>
            )}
            <p className={`${mono} mt-3 text-center text-[10px] text-[#888]`}>
              {price ? `${price}/month · ` : ""}cancel any time · full dashboard on day one
            </p>
          </div>
        )}

        <div className="my-10 border-t border-[#e8e8e8]" />
        <p className={`${mono} text-[10px] lowercase tracking-[0.12em] text-[#888]`}>what&apos;s waiting for you</p>
        <ul className="mt-4 space-y-2 text-[13px] font-light leading-[1.7] text-[#666]">
          {PENDING_FEATURES.map((f) => (
            <li key={f}>· {f}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { account } = useBrandSession();

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
  }

  return (
    <aside className="sticky top-0 flex h-screen w-16 flex-col border-r border-warm/10 bg-warm/[0.02] sm:w-60">
      <div className="flex items-center gap-2 px-3 py-6 sm:px-6">
        <span className="font-serif text-lg text-bronze2">Q</span>
        <span className="hidden font-serif text-lg text-cream sm:inline truncate">
          {account?.company_name ?? "Qoyl Business"}
        </span>
      </div>

      <nav className="flex-1 space-y-1 px-2 sm:px-3">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-bronze/15 text-bronze2"
                  : "text-muted hover:bg-warm/[0.05] hover:text-cream"
              }`}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="px-2 py-4 sm:px-3">
        <button
          onClick={handleSignOut}
          className="flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted transition-colors hover:bg-warm/[0.05] hover:text-cream"
        >
          <SignOutIcon className="h-5 w-5 shrink-0" />
          <span className="hidden sm:inline">Sign out</span>
        </button>
      </div>
    </aside>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <rect x="4" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="4" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="4" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
      <rect x="13" y="13" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function BoxIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M4 8l8-4 8 4-8 4-8-4Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M4 8v8l8 4 8-4V8" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M12 12v8" stroke="currentColor" strokeWidth="1.5" />
    </svg>
  );
}

function ChartIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M4 20V10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M11 20V4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M18 20v-7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function UserIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M5 20c1.5-4 4.5-6 7-6s5.5 2 7 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

function SignOutIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path d="M9 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M15 16l4-4-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M19 12H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}
