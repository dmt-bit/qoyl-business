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

export type FakeHairBrandAccount = {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  website: string | null;
  instagram_handle: string | null;
  status: string;
  created_at: string;
};

type FakeHairBrandSessionState = {
  loading: boolean;
  session: Session | null;
  account: FakeHairBrandAccount | null;
};

const FakeHairBrandSessionContext = createContext<FakeHairBrandSessionState>({
  loading: true,
  session: null,
  account: null,
});

export function FakeHairBrandSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<FakeHairBrandSessionState>({
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
        .from("fake_hair_brand_accounts")
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
    <FakeHairBrandSessionContext.Provider value={state}>
      {children}
    </FakeHairBrandSessionContext.Provider>
  );
}

export function useFakeHairBrandSession() {
  return useContext(FakeHairBrandSessionContext);
}
