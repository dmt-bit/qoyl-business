"use client";

import Link from "next/link";
import { useState } from "react";
import { ApplyError, ApplyShell, Field, SubmitButton, inputClass, useApplication } from "@/components/apply/ui";

const SOURCE_OPTIONS = [
  { value: "instagram", label: "instagram" },
  { value: "tiktok", label: "tiktok" },
  { value: "friend_or_referral", label: "a friend or referral" },
  { value: "search", label: "search" },
  { value: "other", label: "other" },
];

export default function ApplyPage() {
  const { submit, submitting, submitted, error } = useApplication("/api/apply/brand");
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    website: "",
    instagram_handle: "",
    product_to_score: "",
    why_qoyl: "",
    source: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-md">
          <p className="font-mono text-[10px] lowercase tracking-[0.18em] text-[#aaa]">application received</p>
          <h1 className="mt-4 text-2xl font-bold lowercase tracking-[-1px]">check your email.</h1>
          <div className="my-5 border-t border-[#0a0a0a]" />
          <p className="text-[13px] font-light leading-[1.75] text-[#666]">
            we sent a payment link to <strong className="font-medium text-[#0a0a0a]">{form.email}</strong>. complete
            your setup there to activate your dashboard.
          </p>
          <p className="mt-2 text-[13px] font-light leading-[1.75] text-[#888]">
            after payment your dashboard goes live immediately.
          </p>
          <a
            href="https://qoyl.live/search"
            className="mt-8 inline-block border border-[#0a0a0a] px-7 py-3 text-xs lowercase tracking-[0.06em] hover:bg-[#0a0a0a] hover:text-white"
          >
            search qoyl.live while you wait →
          </a>
        </div>
      </div>
    );
  }

  return (
    <ApplyShell label="brand application" title="apply for brand access">
      <div className="mb-10">
        <p className="font-mono text-[32px] font-bold leading-none text-[#0a0a0a]">$50/month</p>
        <p className="mt-1 font-mono text-[10px] tracking-[0.12em] text-[#888]">
          full brand intelligence · cancel any time
        </p>
      </div>

      <form onSubmit={(e) => submit(e, form)} className="space-y-8">
        <section className="space-y-6">
          <p className="font-mono text-[10px] lowercase tracking-[0.12em] text-[#888]">step 1 — the basics</p>
          <Field label="brand name" required>
            <input type="text" required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="your name" required>
            <input type="text" required value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} />
          </Field>
          <Field label="email" required>
            <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
          </Field>
          <Field label="website or instagram" required>
            <div className="space-y-2">
              <input
                type="text"
                required={!form.instagram_handle}
                placeholder="https://"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
              />
              <input
                type="text"
                required={!form.website}
                placeholder="@yourbrand"
                value={form.instagram_handle}
                onChange={(e) => update("instagram_handle", e.target.value)}
                className={inputClass}
              />
            </div>
          </Field>
        </section>

        <section className="space-y-6">
          <p className="font-mono text-[10px] lowercase tracking-[0.12em] text-[#888]">step 2 — your brand</p>
          <Field label="which product should we score first?">
            <input
              type="text"
              placeholder="e.g. your best-selling leave-in"
              value={form.product_to_score}
              onChange={(e) => update("product_to_score", e.target.value)}
              className={inputClass}
            />
          </Field>
          <Field label="about your brand">
            <textarea rows={4} value={form.why_qoyl} onChange={(e) => update("why_qoyl", e.target.value)} className={inputClass} />
          </Field>
          <Field label="how did you find qoyl?">
            <select value={form.source} onChange={(e) => update("source", e.target.value)} className={inputClass}>
              <option value="">select one</option>
              {SOURCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </Field>
        </section>

        <ApplyError message={error} />
        <SubmitButton submitting={submitting} />
      </form>

      <p className="mt-8 text-center font-mono text-[10px] text-[#888]">
        already applied? <Link href="/login" className="underline">sign in →</Link>
      </p>
    </ApplyShell>
  );
}
