"use client";

import { useState } from "react";
import { HAIR_SELLER_PLAN } from "@/lib/accountTypes";
import { ApplyError, ApplyShell, Field, SubmitButton, SuccessScreen, inputClass, useApplication } from "@/components/apply/ui";

const PRODUCT_COUNT_OPTIONS = ["1-5", "6-15", "16-30", "30+"];

export default function ApplyFakeHairBrandPage() {
  const { submit, submitting, submitted, error } = useApplication("/api/business/hair-seller/apply");
  const [form, setForm] = useState({
    company_name: "",
    contact_name: "",
    email: "",
    website: "",
    instagram_handle: "",
    product_count: "",
    why_qoyl: "",
  });

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  if (submitted) return <SuccessScreen email={form.email} />;

  return (
    <ApplyShell
      label="hair seller application"
      title="list your catalog"
      price={`${HAIR_SELLER_PLAN.price} · flat rate · no commission`}
      intro="get your products matched by color, texture and heat rating into style match shopping lists — and see impressions, clicks and where demand for your hair type is highest."
    >
      <form onSubmit={(e) => submit(e, form)} className="space-y-6">
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
        <Field label="why qoyl?">
          <textarea rows={4} value={form.why_qoyl} onChange={(e) => update("why_qoyl", e.target.value)} className={inputClass} />
        </Field>

        <ApplyError message={error} />
        <SubmitButton submitting={submitting} />
      </form>
    </ApplyShell>
  );
}
