"use server";

import { getSupabaseAdmin } from "./supabaseAdmin";
import { verifyCallerEmail } from "./serverAuth";
import { fetchEnrichedStyleMatches } from "./styleSignals";

export type BookingInquiry = {
  id: string;
  detectedStyle: string;
  createdAt: string;
  followedThrough: boolean;
  consumerEmail: string | null;
};

export type StylistDashboardData = {
  monthlyDemand: { style: string; count: number }[];
  monthlyMatchCount: number;
  bookingInquiries: BookingInquiry[];
};

function cityMatches(matchCity: string | null, stylistCity: string): boolean {
  if (!matchCity) return false;
  const matchCityName = matchCity.split(",")[0]?.trim().toLowerCase();
  return matchCityName === stylistCity.trim().toLowerCase();
}

// accessToken is verified server-side rather than trusting a client-
// supplied stylist id, since this touches other people's data (a
// consumer's email address via booking inquiries) -- see lib/serverAuth.ts.
export async function getStylistDashboardData(
  accessToken: string
): Promise<StylistDashboardData | null> {
  const email = await verifyCallerEmail(accessToken);
  if (!email) return null;

  const supabaseAdmin = getSupabaseAdmin();
  const { data: stylist } = await supabaseAdmin
    .from("stylist_accounts")
    .select("id, city, hair_types_served")
    .eq("email", email)
    .single();

  if (!stylist) return null;

  const servedTypes = new Set((stylist.hair_types_served as string[] | null) ?? []);

  const enriched = await fetchEnrichedStyleMatches();
  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const thisMonthInCity = enriched.filter(
    (m) =>
      m.createdAt &&
      new Date(m.createdAt) >= monthStart &&
      cityMatches(m.city, stylist.city) &&
      (servedTypes.size === 0 || m.compatibleHairTypes.some((t) => servedTypes.has(t)))
  );

  const demandCounts = new Map<string, number>();
  for (const m of thisMonthInCity) {
    demandCounts.set(m.detectedStyle, (demandCounts.get(m.detectedStyle) ?? 0) + 1);
  }
  const monthlyDemand = Array.from(demandCounts.entries())
    .map(([style, count]) => ({ style, count }))
    .sort((a, b) => b.count - a.count);

  const { data: matches } = await supabaseAdmin
    .from("style_matches")
    .select("id, user_id, detected_style, created_at, followed_through")
    .eq("stylist_id", stylist.id)
    .order("created_at", { ascending: false });

  const bookingInquiries: BookingInquiry[] = await Promise.all(
    (matches ?? []).map(async (m) => {
      let consumerEmail: string | null = null;
      if (m.user_id) {
        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(m.user_id);
        consumerEmail = userRes.user?.email ?? null;
      }
      return {
        id: m.id,
        detectedStyle: m.detected_style ?? "Unknown style",
        createdAt: m.created_at,
        followedThrough: m.followed_through === true,
        consumerEmail,
      };
    })
  );

  return {
    monthlyDemand,
    monthlyMatchCount: thisMonthInCity.length,
    bookingInquiries,
  };
}
