// Shared by /admin and /admin/vendors. Plain server component (no client
// state) -- every link carries the same ?password= the current page was
// already gated with, since Next's app router doesn't pass searchParams to
// layout.tsx, so there's no single place to centralize the auth check.
const NAV: { key: string; label: string; disabled?: boolean }[] = [
  { key: "overview", label: "overview" },
  { key: "vendors", label: "vendors" },
  { key: "brands", label: "brands" },
  { key: "events", label: "events", disabled: true },
  { key: "settings", label: "settings", disabled: true },
];

function hrefFor(key: string, password: string): string {
  const p = encodeURIComponent(password);
  if (key === "vendors") return `/admin/vendors?password=${p}`;
  if (key === "brands") return `/admin?password=${p}&tab=brand_accounts`;
  return `/admin?password=${p}`;
}

export default function AdminSidebar({ password, active }: { password: string; active: string }) {
  return (
    <aside className="flex w-full shrink-0 flex-row gap-1 overflow-x-auto bg-[#0a0a0a] px-4 py-4 sm:w-48 sm:min-h-screen sm:flex-col sm:gap-0.5 sm:overflow-visible sm:py-6">
      <p className="hidden px-3 pb-4 font-mono text-[10px] lowercase tracking-[0.18em] text-white/40 sm:block">qoyl admin</p>
      {NAV.map((item) =>
        item.disabled ? (
          <span
            key={item.key}
            title="not built yet"
            className="shrink-0 cursor-not-allowed whitespace-nowrap px-3 py-2 text-sm lowercase text-white/25"
          >
            {item.label}
          </span>
        ) : (
          <a
            key={item.key}
            href={hrefFor(item.key, password)}
            className={`shrink-0 whitespace-nowrap px-3 py-2 text-sm lowercase transition-colors ${
              active === item.key ? "bg-white/10 text-white" : "text-white/60 hover:text-white"
            }`}
          >
            {item.label}
          </a>
        )
      )}
    </aside>
  );
}
