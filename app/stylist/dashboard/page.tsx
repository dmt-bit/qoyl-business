"use client";

import { useEffect, useState } from "react";
import { useStylistSession } from "@/lib/stylistSession";
import { getStylistDashboardData, type StylistDashboardData } from "@/lib/stylistData";

export default function StylistDashboardPage() {
  const { loading: sessionLoading, session, account } = useStylistSession();
  const [data, setData] = useState<StylistDashboardData | null>(null);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!session) return;
    let cancelled = false;

    getStylistDashboardData(session.access_token).then((result) => {
      if (!cancelled) {
        setData(result);
        setDataLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [session]);

  if (sessionLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  const topStyle = data?.monthlyDemand[0] ?? null;

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-4xl">
        <h1 className="font-serif text-3xl sm:text-4xl text-cream">
          Welcome, {account.display_name}
        </h1>
        <p className="mt-1 text-sm text-muted">{account.city}</p>

        <section className="mt-10 rounded-lg border border-bronze/30 bg-bronze/10 p-6">
          <p className="text-xs uppercase tracking-wider text-bronze2">
            Your potential clients this month
          </p>
          {dataLoading ? (
            <p className="mt-2 text-sand">Loading...</p>
          ) : topStyle ? (
            <p className="mt-2 font-serif text-2xl text-cream">
              {data!.monthlyMatchCount} user{data!.monthlyMatchCount === 1 ? "" : "s"} in{" "}
              {account.city} matched {topStyle.style}
            </p>
          ) : (
            <p className="mt-2 text-sand">
              No matches in {account.city} yet this month — check back as more Qoyl
              consumers use Style Match nearby.
            </p>
          )}
        </section>

        {data && data.monthlyDemand.length > 0 && (
          <section className="mt-10">
            <h2 className="font-serif text-xl text-cream mb-4">
              This month&apos;s demand by style
            </h2>
            <ol className="space-y-2">
              {data.monthlyDemand.map((d, i) => (
                <li
                  key={d.style}
                  className="flex items-center justify-between rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                >
                  <span className="text-sand">
                    <span className="text-muted mr-2">{i + 1}.</span>
                    {d.style}
                  </span>
                  <span className="text-bronze2">{d.count}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <section className="mt-10 mb-8">
          <h2 className="font-serif text-xl text-cream mb-1">Booking inquiries</h2>
          <p className="mb-4 text-xs text-muted">
            Consumers who chose you after a style match. Reply directly by email —
            no in-app inbox yet.
          </p>
          {dataLoading ? (
            <p className="text-sm text-muted">Loading...</p>
          ) : !data || data.bookingInquiries.length === 0 ? (
            <p className="text-sm text-muted">
              No booking inquiries yet — they&apos;ll show up here as consumers pick you
              after a Style Match.
            </p>
          ) : (
            <div className="space-y-2">
              {data.bookingInquiries.map((inquiry) => (
                <div
                  key={inquiry.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-warm/10 bg-warm/[0.03] px-4 py-3 text-sm"
                >
                  <div>
                    <p className="text-cream">{inquiry.detectedStyle}</p>
                    <p className="text-xs text-muted">
                      {new Date(inquiry.createdAt).toLocaleDateString()} ·{" "}
                      {inquiry.followedThrough ? "Followed through" : "Pending"}
                    </p>
                  </div>
                  {inquiry.consumerEmail && (
                    <a
                      href={`mailto:${inquiry.consumerEmail}`}
                      className="rounded-full bg-bronze px-4 py-2 text-xs font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2"
                    >
                      Reply by email
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
