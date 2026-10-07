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

export type RecentMatch = {
  id: string;
  style: string;
  curlType: string | null;
  porosity: string | null;
  createdAt: string;
};

export type StylistDashboardData = {
  // Demand board: potential clients in this stylist's city/hair types,
  // whether or not they were actually linked to this stylist_id yet.
  monthlyDemand: { style: string; count: number }[];
  monthlyMatchCount: number;
  // Section 3: this stylist's own match history (style_matches.stylist_id).
  totalMatchCount: number;
  matchesThisMonthCount: number;
  // Proxy for "booking link taps" - there's no click tracking on the
  // booking_url itself, so this counts matches the consumer followed
  // through on (style_matches.followed_through), the closest real signal
  // that exists today.
  bookingLinkTaps: number;
  topMatchedStyle: string | null;
  recentMatches: RecentMatch[];
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

  const allMatches = matches ?? [];

  const bookingInquiries: BookingInquiry[] = await Promise.all(
    allMatches.map(async (m) => {
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

  // Most common style across this stylist's full match history.
  const styleCounts = new Map<string, number>();
  for (const m of allMatches) {
    const style = m.detected_style ?? null;
    if (style) styleCounts.set(style, (styleCounts.get(style) ?? 0) + 1);
  }
  const topMatchedStyle = Array.from(styleCounts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

  // Last 5 matches, enriched with the consumer's current curl_type/porosity -
  // never their email/name, per the dashboard's "no personal user data" rule.
  const recentRaw = allMatches.slice(0, 5);
  const recentUserIds = Array.from(new Set(recentRaw.map((m) => m.user_id).filter((id): id is string => Boolean(id))));
  const { data: recentProfiles } =
    recentUserIds.length > 0
      ? await supabaseAdmin.from("hair_profiles").select("user_id, curl_type, porosity").in("user_id", recentUserIds)
      : { data: [] as { user_id: string; curl_type: string | null; porosity: string | null }[] };
  const profileByUserId = new Map((recentProfiles ?? []).map((p) => [p.user_id, p]));

  const recentMatches: RecentMatch[] = recentRaw.map((m) => {
    const profile = m.user_id ? profileByUserId.get(m.user_id) : undefined;
    return {
      id: m.id,
      style: m.detected_style ?? "Unknown style",
      curlType: profile?.curl_type ?? null,
      porosity: profile?.porosity ?? null,
      createdAt: m.created_at,
    };
  });

  return {
    monthlyDemand,
    monthlyMatchCount: thisMonthInCity.length,
    totalMatchCount: allMatches.length,
    matchesThisMonthCount: allMatches.filter((m) => new Date(m.created_at) >= monthStart).length,
    bookingLinkTaps: allMatches.filter((m) => m.followed_through === true).length,
    topMatchedStyle,
    recentMatches,
    bookingInquiries,
  };
}
