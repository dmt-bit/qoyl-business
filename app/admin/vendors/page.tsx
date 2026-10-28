import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminSidebar from "@/components/admin/AdminSidebar";
import VendorsTable, { type VendorProfile } from "@/components/admin/VendorsTable";

export const dynamic = "force-dynamic";

// Same password-gate pattern as app/admin/page.tsx -- Next's app router
// doesn't pass searchParams to layout.tsx, so each admin page checks it
// independently rather than sharing one gate.
export default async function AdminVendorsPage({
  searchParams,
}: {
  searchParams: { password?: string };
}) {
  const password = searchParams.password ?? "";
  const authorized = password.length > 0 && password === process.env.ADMIN_PASSWORD;

  if (!authorized) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form action="/admin/vendors" method="get" className="w-full max-w-sm">
          <h1 className="mb-6 text-center font-serif text-2xl text-cream">Admin access</h1>
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

  const { data: vendors } = await getSupabaseAdmin()
    .from("vendor_profiles")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <div className="flex min-h-screen flex-col bg-white sm:flex-row">
      <AdminSidebar password={password} active="vendors" />
      <main className="min-w-0 flex-1 px-6 py-10 sm:px-10">
        <h1 className="text-2xl font-bold lowercase tracking-[-0.5px] text-[#0a0a0a]">vendor signups</h1>
        <p className="mt-1 text-sm text-[#666]">all stylist, hair seller, and brand signups from /join.</p>
        <div className="mt-8">
          <VendorsTable vendors={(vendors ?? []) as VendorProfile[]} password={password} />
        </div>
      </main>
    </div>
  );
}
