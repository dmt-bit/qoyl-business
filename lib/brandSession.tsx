"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type BrandAccount = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string | null;
  instagram_handle: string | null;
  tier: string;
  status: string;
  created_at: string;
};

type BrandSessionState = {
  loading: boolean;
  session: Session | null;
  account: BrandAccount | null;
};

const BrandSessionContext = createContext<BrandSessionState>({
  loading: true,
  session: null,
  account: null,
});

export function BrandSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<BrandSessionState>({
    loading: true,
    session: null,
    account: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        router.replace("/login");
        return;
      }

      const { data: account } = await supabase
        .from("brand_accounts")
        .select("*")
        .eq("email", session.user.email)
        .single();

      if (!cancelled) {
        setState({ loading: false, session, account: account ?? null });
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  return (
    <BrandSessionContext.Provider value={state}>
      {children}
    </BrandSessionContext.Provider>
  );
}

export function useBrandSession() {
  return useContext(BrandSessionContext);
}
