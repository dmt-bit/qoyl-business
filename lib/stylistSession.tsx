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

export type StylistAccount = {
  id: string;
  display_name: string;
  contact_name: string;
  email: string;
  city: string;
  neighborhood: string | null;
  salon_name: string | null;
  website: string | null;
  instagram: string | null;
  years_experience: number | null;
  hair_types_served: string[] | null;
  bio: string | null;
  booking_url: string | null;
  status: string;
  created_at: string;
};

type StylistSessionState = {
  loading: boolean;
  session: Session | null;
  account: StylistAccount | null;
};

const StylistSessionContext = createContext<StylistSessionState>({
  loading: true,
  session: null,
  account: null,
});

export function StylistSessionProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [state, setState] = useState<StylistSessionState>({
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
        .from("stylist_accounts")
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
    <StylistSessionContext.Provider value={state}>
      {children}
    </StylistSessionContext.Provider>
  );
}

export function useStylistSession() {
  return useContext(StylistSessionContext);
}
