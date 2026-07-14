import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminTabs from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: { password?: string; tab?: string };
}) {
  const password = searchParams.password ?? "";
  const authorized =
    password.length > 0 && password === process.env.ADMIN_PASSWORD;

  if (!authorized) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <form action="/admin" method="get" className="w-full max-w-sm">
          <h1 className="font-serif text-2xl text-cream mb-6 text-center">
            Admin access
          </h1>
          <input
            type="password"
            name="password"
            placeholder="Password"
            autoFocus
            className="w-full rounded-md border border-warm/15 bg-warm/[0.04] px-4 py-3 text-cream placeholder:text-muted focus:border-bronze focus:outline-none"
          />
          <button
            type="submit"
            className="mt-4 w-full rounded-full bg-bronze px-8 py-3 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
          >
            Enter
          </button>
        </form>
      </div>
    );
  }

  const supabaseAdmin = getSupabaseAdmin();
  const [{ data: applications }, { data: accounts }] = await Promise.all([
    supabaseAdmin
      .from("brand_applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("brand_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="min-h-screen px-6 py-12 sm:px-12">
      <h1 className="font-serif text-3xl text-cream mb-8">Admin</h1>

      <AdminTabs
        applications={applications ?? []}
        accounts={accounts ?? []}
        password={password}
        initialTab={searchParams.tab === "accounts" ? "accounts" : "applications"}
      />
    </div>
  );
}
