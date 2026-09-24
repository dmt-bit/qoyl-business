"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import Link from "next/link";

const mono = { fontFamily: "var(--font-mono-apply), monospace" } as const;

export const inputClass =
  "w-full border border-[#0a0a0a] bg-white px-4 py-3 text-sm font-light text-[#0a0a0a] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]";

export function ApplyShell({
  label,
  title,
  intro,
  price,
  children,
}: {
  label: string;
  title: string;
  intro: string;
  price?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <nav className="flex items-center justify-between border-b border-[#e8e8e8] px-6 py-5 sm:px-8">
        <Link href="/" className="text-[17px] font-bold lowercase tracking-tight text-[#0a0a0a]">
          qoyl
          <span className="ml-1.5 text-[9px] font-normal tracking-[0.12em] text-[#aaa]" style={mono}>
            business
          </span>
        </Link>
        <Link href="/" className="text-[11px] lowercase text-[#666] hover:text-[#0a0a0a]">
          ← back
        </Link>
      </nav>

      <main className="mx-auto max-w-xl px-6 pb-24 pt-14 sm:px-8">
        <p className="text-[10px] lowercase tracking-[0.18em] text-[#aaa]" style={mono}>
          {label}
        </p>
        <h1 className="mt-4 text-4xl font-bold lowercase leading-[0.95] tracking-[-2px] sm:text-5xl">{title}</h1>
        {price && (
          <p className="mt-5 inline-block border border-[#0a0a0a] px-3 py-1.5 text-xs lowercase" style={mono}>
            {price}
          </p>
        )}
        <p className="mt-5 text-sm font-light leading-relaxed text-[#666]">{intro}</p>
        <div className="mt-10">{children}</div>
      </main>
    </div>
  );
}

export function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-[10px] lowercase tracking-[0.12em] text-[#666]" style={mono}>
        {label}
        {required && <span className="text-[#0a0a0a]"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function SubmitButton({ submitting }: { submitting: boolean }) {
  return (
    <button
      type="submit"
      disabled={submitting}
      className="w-full bg-[#0a0a0a] px-8 py-4 text-xs font-semibold lowercase tracking-[0.06em] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
    >
      {submitting ? "submitting…" : "submit application →"}
    </button>
  );
}

export function ApplyError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p className="border border-[#0a0a0a] bg-[#f5f5f5] px-4 py-3 text-sm text-[#0a0a0a]" role="alert">
      {message}
    </p>
  );
}

export function SuccessScreen({ email }: { email: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md">
        <p className="text-[10px] lowercase tracking-[0.18em] text-[#aaa]" style={mono}>
          application received
        </p>
        <h1 className="mt-4 text-4xl font-bold lowercase leading-[0.95] tracking-[-2px]">we got it.</h1>
        <p className="mt-5 text-sm font-light leading-relaxed text-[#666]">
          we review every application personally and will be in touch within 48 hours. a confirmation is on its
          way to <strong className="font-medium text-[#0a0a0a]">{email}</strong> — check spam if you don&apos;t
          see it.
        </p>
        <Link
          href="/"
          className="mt-8 inline-block border border-[#0a0a0a] px-7 py-3 text-xs lowercase tracking-[0.06em] hover:bg-[#0a0a0a] hover:text-white"
        >
          ← back to home
        </Link>
      </div>
    </div>
  );
}

// Posts the form to its /api route (which saves it, alerts hey@qoyl.live and
// sends the applicant's welcome email) instead of writing to Supabase from
// the browser.
export function useApplication(endpoint: string) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: FormEvent, payload: Record<string, unknown>) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message ?? "Something went wrong submitting your application. Please try again.");
      } else {
        setSubmitted(true);
      }
    } catch {
      setError("Couldn't reach the server. Please check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return { submit, submitting, submitted, error };
}
