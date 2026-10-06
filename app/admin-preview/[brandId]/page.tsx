"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { BrandSessionProvider, useBrandSession } from "@/lib/brandSession";
import { ADMIN_EMAIL } from "@/lib/adminConfig";
import DashboardPage from "@/app/(brand)/dashboard/page";

// Admin-only view of any brand's dashboard, regardless of status. Reads go
// through the admin RLS policy (supabase/admin_preview_policies.sql), so a
// non-admin session gets no data even if this client check were bypassed.
export default function AdminPreviewPage({ params }: { params: { brandId: string } }) {
  return (
    <BrandSessionProvider brandId={params.brandId}>
      <AdminGate>
        <DashboardPage />
      </AdminGate>
    </BrandSessionProvider>
  );
}

function AdminGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { loading, session, account } = useBrandSession();
  const isAdmin = session?.user.email?.toLowerCase() === ADMIN_EMAIL;

  useEffect(() => {
    if (!loading && !isAdmin) router.replace("/login");
  }, [loading, isAdmin, router]);

  if (loading) return <p className="p-8 font-mono text-xs text-[#888]">loading…</p>;
  if (!isAdmin) return null;
  if (!account) {
    return <p className="p-8 font-mono text-xs text-[#888]">brand not found.</p>;
  }

  return (
    <>
      <div
        style={{
          background: "#FFF3CD",
          border: "1px solid #C4831A",
          padding: "8px 16px",
          fontFamily: "Space Mono, monospace",
          fontSize: "10px",
          color: "#C4831A",
          letterSpacing: "0.08em",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span>
          admin preview · {account.company_name} · status: {account.status}
        </span>
        <span>this view is only visible to hey@qoyl.live</span>
      </div>
      {children}
    </>
  );
}
