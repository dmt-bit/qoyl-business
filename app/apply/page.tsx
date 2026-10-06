"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { BRAND_TIERS, isBrandTier, type BrandTier } from "@/lib/accountTypes";
import { ApplyError, ApplyShell, Field, SubmitButton, inputClass, useApplication } from "@/components/apply/ui";

const PRODUCT_COUNT_OPTIONS = ["1-5", "6-15", "16-30", "30+"];
const REVENUE_OPTIONS = ["Under $100K", "$100K - $500K", "$500K - $1M", "$1M - $5M", "$5M+"];
const TIER_ORDER: BrandTier[] = ["early_stage", "growth", "enterprise"];

export default function ApplyPage() {
  return (
    <Suspense fallback={null}>
      <ApplyForm />
    </Suspense>
  );
}

function ApplyForm() {
  const searchParams = useSearchParams();
  const tierParam = searchParams.get("tier");
  const [tier, setTier] = useState<BrandTier | null>(isBrandTier(tierParam) ? tierParam : null);

  const { submit, submitting, submitted, error } = useApplication("/api/apply/brand");
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    website: "",
    instagram_handle: "",
    product_count: "",
    annual_revenue: "",
    product_to_score: "",
    why_qoyl: "",
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
    <ApplyShell
      label="brand application"
      title="apply for brand access"
      intro="pick a plan and tell us about your brand. you'll get a payment link straight away — once you pay, your dashboard is live."
    >
      <form
        onSubmit={(e) => submit(e, { ...form, requested_tier: tier })}
        className="space-y-6"
      >
        <div>
          <span className="mb-2 block font-mono text-[10px] lowercase tracking-[0.12em] text-[#666]">
            choose your plan *
          </span>
          <div className="grid gap-2 sm:grid-cols-3">
            {TIER_ORDER.map((t) => {
              const plan = BRAND_TIERS[t];
              const selected = tier === t;
              return (
                <button
                  key={t}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => setTier(t)}
                  className={`border border-[#0a0a0a] px-4 py-3 text-left transition-colors ${
                    selected ? "bg-[#0a0a0a] text-white" : "bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]"
                  }`}
                >
                  <span className="block text-sm font-medium lowercase">{plan.label}</span>
                  <span className="mt-1 block font-mono text-[11px]">{plan.price}</span>
                </button>
              );
            })}
          </div>
        </div>

        <Field label="company name" required>
          <input type="text" required value={form.company_name} onChange={(e) => update("company_name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="contact name" required>
          <input type="text" required value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} />
        </Field>
        <Field label="email" required>
          <input type="email" required value={form.email} onChange={(e) => update("email", e.target.value)} className={inputClass} />
        </Field>
        <Field label="website">
          <input type="text" placeholder="https://" value={form.website} onChange={(e) => update("website", e.target.value)} className={inputClass} />
        </Field>
        <Field label="instagram handle">
          <input type="text" placeholder="@yourbrand" value={form.instagram_handle} onChange={(e) => update("instagram_handle", e.target.value)} className={inputClass} />
        </Field>
        <Field label="how many products do you sell?">
          <select value={form.product_count} onChange={(e) => update("product_count", e.target.value)} className={inputClass}>
            <option value="">select one</option>
            {PRODUCT_COUNT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="annual revenue">
          <select value={form.annual_revenue} onChange={(e) => update("annual_revenue", e.target.value)} className={inputClass}>
            <option value="">select one</option>
            {REVENUE_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </Field>
        <Field label="which product should we score first?">
          <input
            type="text"
            placeholder="e.g. your best-selling leave-in"
            value={form.product_to_score}
            onChange={(e) => update("product_to_score", e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="why qoyl?">
          <textarea rows={4} value={form.why_qoyl} onChange={(e) => update("why_qoyl", e.target.value)} className={inputClass} />
        </Field>

        <ApplyError message={error} />
        <SubmitButton submitting={submitting} />
      </form>

      <p className="mt-8 text-center font-mono text-[10px] text-[#888]">
        already applied? <Link href="/login" className="underline">sign in →</Link>
      </p>
    </ApplyShell>
  );
}
