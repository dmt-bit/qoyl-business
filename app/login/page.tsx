"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (signInError) {
      setSubmitting(false);
      setError("Invalid email or password.");
      return;
    }

    // One login for all three account types -- route based on whichever
    // table has a matching row for this email. RLS on each table already
    // scopes the read to the caller's own row, so this can't be used to
    // probe other accounts.
    const [{ data: stylist }, { data: fakeHairBrand }] = await Promise.all([
      supabase.from("stylist_accounts").select("id").eq("email", email).maybeSingle(),
      supabase.from("fake_hair_brand_accounts").select("id").eq("email", email).maybeSingle(),
    ]);

    setSubmitting(false);

    if (stylist) {
      router.push("/stylist/dashboard");
    } else if (fakeHairBrand) {
      router.push("/fake-hair-brand/dashboard");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <Link
          href="/"
          className="text-sm text-muted hover:text-cream transition-colors"
        >
          ← Qoyl Business
        </Link>

        <h1 className="font-serif text-3xl text-cream mt-6 mb-2">Log in</h1>
        <p className="mb-8 text-sm text-muted">
          For brand, stylist, and fake hair brand partner accounts.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <label className="block">
            <span className="mb-2 block text-sm text-sand">Email</span>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-md border border-warm/15 bg-warm/[0.04] px-4 py-3 text-cream focus:border-bronze focus:outline-none"
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-sand">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-md border border-warm/15 bg-warm/[0.04] px-4 py-3 text-cream focus:border-bronze focus:outline-none"
            />
          </label>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-bronze px-8 py-3 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
