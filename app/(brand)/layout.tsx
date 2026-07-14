"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { BrandSessionProvider, useBrandSession } from "@/lib/brandSession";

const NAV_ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/dashboard", label: "My Products", icon: BoxIcon },
  { href: "/insights", label: "Market Insights", icon: ChartIcon },
  { href: "/account", label: "Account", icon: UserIcon },
];

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <BrandSessionProvider>
      <div className="min-h-screen flex">
        <Sidebar />
        <main className="flex-1 min-w-0">{children}</main>
      </div>
    </BrandSessionProvider>
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
