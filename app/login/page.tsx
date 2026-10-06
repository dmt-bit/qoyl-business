"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const mono = { fontFamily: "var(--font-mono-apply), monospace" } as const;
const inputClass =
  "w-full border border-[#0a0a0a] bg-white px-4 py-3 text-sm font-light text-[#0a0a0a] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]";
const primaryButton =
  "w-full bg-[#0a0a0a] px-8 py-4 text-xs font-semibold lowercase tracking-[0.06em] text-white transition-opacity hover:opacity-80 disabled:opacity-50";

// One login for brand, stylist and hair seller accounts. Magic link is the
// main path (every account is created without a password); the password form
// is still there for anyone who set one.
export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [linkSentTo, setLinkSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleMagicLink(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/business/auth/magic-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok || !data?.success) {
        setError(data?.message ?? "Something went wrong. Please try again.");
      } else {
        setLinkSentTo(email.trim());
      }
    } catch {
      setError("Couldn't reach the server. Check your connection and try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handlePassword(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setSubmitting(false);
      setError("Invalid email or password.");
      return;
    }

    // Route by whichever table has a row for this email. RLS scopes each read
    // to the caller's own row, so this can't be used to probe other accounts.
    const [{ data: stylist }, { data: fakeHairBrand }] = await Promise.all([
      supabase.from("stylist_accounts").select("id").eq("email", email).maybeSingle(),
      supabase.from("fake_hair_brand_accounts").select("id").eq("email", email).maybeSingle(),
    ]);
    setSubmitting(false);

    if (stylist) router.push("/stylist/dashboard");
    else if (fakeHairBrand) router.push("/fake-hair-brand/dashboard");
    else router.push("/dashboard");
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-6 py-12">
      <div className="w-full max-w-[400px] border border-[#0a0a0a] px-8 py-10">
        <Link href="/" className="block text-[17px] font-bold lowercase tracking-tight">
          qoyl
          <span className="ml-1.5 text-[9px] font-normal tracking-[0.12em] text-[#aaa]" style={mono}>
            business
          </span>
        </Link>

        {linkSentTo ? (
          <div className="mt-10">
            <p className="font-mono text-[10px] lowercase tracking-[0.12em] text-[#888]">check your inbox</p>
            <h1 className="mt-3 text-xl font-bold lowercase tracking-[-0.5px]">
              check {linkSentTo} for your sign-in link.
            </h1>
            <p className="mt-4 text-[13px] font-light leading-[1.7] text-[#666]">
              if an account exists for that email, a link is on its way. it works once. check spam if you don&apos;t
              see it within a few minutes.
            </p>
            <button
              type="button"
              onClick={() => setLinkSentTo(null)}
              className="mt-6 font-mono text-[10px] lowercase text-[#888] underline"
            >
              use a different email
            </button>
          </div>
        ) : (
          <>
            <h1 className="mt-10 text-xl font-bold lowercase tracking-[-0.5px]">sign in with email</h1>
            <p className="mt-2 text-[13px] font-light text-[#666]">
              we&apos;ll send you a sign-in link — no password needed.
            </p>

            <form onSubmit={handleMagicLink} className="mt-6 space-y-3">
              <input
                type="email"
                required
                placeholder="you@brand.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
              />
              <button type="submit" disabled={submitting} className={primaryButton}>
                {submitting ? "sending…" : "send link →"}
              </button>
            </form>
          </>
        )}

        {error && (
          <p className="mt-4 border border-[#0a0a0a] bg-[#f5f5f5] px-4 py-3 text-sm" role="alert">
            {error}
          </p>
        )}

        {!linkSentTo && (
          <div className="mt-8">
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="font-mono text-[10px] lowercase text-[#888] hover:text-[#0a0a0a]"
            >
              {showPassword ? "← use a sign-in link instead" : "prefer a password? sign in here →"}
            </button>

            {showPassword && (
              <form onSubmit={handlePassword} className="mt-4 space-y-3">
                <input
                  type="email"
                  required
                  placeholder="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
                <input
                  type="password"
                  required
                  placeholder="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={inputClass}
                />
                <button type="submit" disabled={submitting} className={primaryButton}>
                  {submitting ? "signing in…" : "sign in →"}
                </button>
              </form>
            )}
          </div>
        )}

        <p className="mt-10 border-t border-[#e8e8e8] pt-6 font-mono text-[10px] text-[#888]">
          not yet a brand?{" "}
          <Link href="/apply" className="text-[#0a0a0a] underline">
            apply for brand access →
          </Link>
        </p>
      </div>
    </div>
  );
}
