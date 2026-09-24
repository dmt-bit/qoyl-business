"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { BRAND_TIERS, isBrandTier } from "@/lib/accountTypes";
import { ApplyError, ApplyShell, Field, SubmitButton, SuccessScreen, inputClass, useApplication } from "@/components/apply/ui";

const PRODUCT_COUNT_OPTIONS = ["1-5", "6-15", "16-30", "30+"];
const REVENUE_OPTIONS = ["Under $100K", "$100K - $500K", "$500K - $1M", "$1M - $5M", "$5M+"];

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
  const tier = isBrandTier(tierParam) ? tierParam : null;

  const { submit, submitting, submitted, error } = useApplication("/api/apply/brand");
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

  if (submitted) return <SuccessScreen email={form.email} />;

  return (
    <ApplyShell
      label="brand application"
      title="apply for brand access"
      price={tier ? `${BRAND_TIERS[tier].label} — ${BRAND_TIERS[tier].price}` : undefined}
      intro="tell us about your brand. we review every application personally."
    >
      <form onSubmit={(e) => submit(e, { ...form, requested_tier: tier })} className="space-y-6">
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
        <Field label="why qoyl?">
          <textarea rows={4} value={form.why_qoyl} onChange={(e) => update("why_qoyl", e.target.value)} className={inputClass} />
        </Field>

        <ApplyError message={error} />
        <SubmitButton submitting={submitting} />
      </form>
    </ApplyShell>
  );
}
