import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import AdminTabs from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminPage({
  searchParams,
}: {
  searchParams: {
    password?: string;
    tab?: string;
    approved_email?: string;
    approval_status?: string;
    error_detail?: string;
  };
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
  const [
    { data: brandApplications },
    { data: brandAccounts },
    { data: fakeHairApplications },
    { data: fakeHairAccounts },
    { data: stylistApplications },
    { data: stylistAccounts },
    { data: sellerProducts },
  ] = await Promise.all([
    supabaseAdmin.from("brand_applications").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("brand_accounts").select("*").order("created_at", { ascending: false }),
    supabaseAdmin
      .from("fake_hair_brand_applications")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("fake_hair_brand_accounts")
      .select("*")
      .order("created_at", { ascending: false }),
    supabaseAdmin.from("stylist_applications").select("*").order("created_at", { ascending: false }),
    supabaseAdmin.from("stylist_accounts").select("*").order("created_at", { ascending: false }),
    supabaseAdmin
      .from("fake_hair_products")
      .select("id, brand_id, product_name, hair_type, in_stock")
      .order("product_name"),
  ]);

  const VALID_TABS = new Set([
    "brand_applications",
    "brand_accounts",
    "hair_sellers",
    "stylist_applications",
    "stylist_accounts",
  ]);
  const initialTab = VALID_TABS.has(searchParams.tab ?? "")
    ? (searchParams.tab as
        | "brand_applications"
        | "brand_accounts"
        | "hair_sellers"
        | "stylist_applications"
        | "stylist_accounts")
    : "brand_applications";

  return (
    <div className="min-h-screen px-6 py-12 sm:px-12">
      <h1 className="font-serif text-3xl text-cream mb-8">Admin</h1>

      <AdminTabs
        brandApplications={brandApplications ?? []}
        brandAccounts={brandAccounts ?? []}
        fakeHairApplications={fakeHairApplications ?? []}
        fakeHairAccounts={fakeHairAccounts ?? []}
        stylistApplications={stylistApplications ?? []}
        stylistAccounts={stylistAccounts ?? []}
        sellerProducts={sellerProducts ?? []}
        password={password}
        initialTab={initialTab}
        approvedEmail={searchParams.approved_email ?? null}
        approvalStatus={searchParams.approval_status ?? null}
        errorDetail={searchParams.error_detail ?? null}
      />
    </div>
  );
}
