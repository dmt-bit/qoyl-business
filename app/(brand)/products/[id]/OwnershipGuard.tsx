"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useBrandSession } from "@/lib/brandSession";

// The page's data fetch runs server-side with the service role key (no
// RLS), so ownership has to be checked here instead, once the client
// knows who's logged in.
export default function OwnershipGuard({ ownerBrandId }: { ownerBrandId: string }) {
  const router = useRouter();
  const { loading, account } = useBrandSession();

  useEffect(() => {
    if (!loading && account && account.id !== ownerBrandId) {
      router.replace("/dashboard");
    }
  }, [loading, account, ownerBrandId, router]);

  return null;
}
