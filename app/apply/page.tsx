"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const PRODUCT_COUNT_OPTIONS = ["1-5", "6-15", "16-30", "30+"];
const REVENUE_OPTIONS = [
  "Under $100K",
  "$100K - $500K",
  "$500K - $1M",
  "$1M - $5M",
  "$5M+",
];

export default function ApplyPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    website: "",
    instagram_handle: "",
    product_count: "",
    annual_revenue: "",
    why_qoyl: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase
      .from("brand_applications")
      .insert({
        company_name: form.company_name,
        contact_name: form.contact_name,
        email: form.email,
        website: form.website || null,
        instagram_handle: form.instagram_handle || null,
        product_count: form.product_count || null,
        annual_revenue: form.annual_revenue || null,
        why_qoyl: form.why_qoyl || null,
      });

    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong submitting your application. Please try again.");
      return;
    }

    setSubmitted(true);
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center px-6">
        <div className="max-w-md text-center">
          <h1 className="font-serif text-3xl text-cream">
            Application received
          </h1>
          <p className="mt-4 text-sand leading-relaxed">
            We review every application personally and will be in touch
            within 48 hours.
          </p>
          <Link
            href="/"
            className="mt-8 inline-block text-sm text-bronze2 hover:text-bronze transition-colors"
          >
            ← Back to home
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen px-6 py-16 sm:px-12">
      <div className="mx-auto max-w-xl">
        <Link
          href="/"
          className="text-sm text-muted hover:text-cream transition-colors"
        >
          ← Qoyl Business
        </Link>

        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-6">
          Apply for brand access
        </h1>
        <p className="mt-3 text-sand leading-relaxed">
          Tell us about your brand. We review every application personally.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <Field label="Company name" required>
            <input
              type="text"
              required
              value={form.company_name}
              onChange={(e) => update("company_name", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Contact name" required>
            <input
              type="text"
              required
              value={form.contact_name}
              onChange={(e) => update("contact_name", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Email" required>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => update("email", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Website">
            <input
              type="text"
              placeholder="https://"
              value={form.website}
              onChange={(e) => update("website", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Instagram handle">
            <input
              type="text"
              placeholder="@yourbrand"
              value={form.instagram_handle}
              onChange={(e) => update("instagram_handle", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="How many products do you sell?">
            <select
              value={form.product_count}
              onChange={(e) => update("product_count", e.target.value)}
              className={inputClass}
            >
              <option value="">Select one</option>
              {PRODUCT_COUNT_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Annual revenue">
            <select
              value={form.annual_revenue}
              onChange={(e) => update("annual_revenue", e.target.value)}
              className={inputClass}
            >
              <option value="">Select one</option>
              {REVENUE_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Why Qoyl?">
            <textarea
              rows={4}
              value={form.why_qoyl}
              onChange={(e) => update("why_qoyl", e.target.value)}
              className={inputClass}
            />
          </Field>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-bronze px-8 py-4 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit application"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-warm/15 bg-warm/[0.04] px-4 py-3 text-cream placeholder:text-muted focus:border-bronze focus:outline-none";

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-sand">
        {label}
        {required && <span className="text-bronze2"> *</span>}
      </span>
      {children}
    </label>
  );
}
