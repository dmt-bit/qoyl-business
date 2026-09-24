"use client";

import { useState } from "react";
import { STYLIST_PLAN } from "@/lib/accountTypes";
import { ApplyError, ApplyShell, Field, SubmitButton, SuccessScreen, inputClass, useApplication } from "@/components/apply/ui";

const HAIR_TYPES = [
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
];

export default function ApplyStylistPage() {
  const { submit, submitting, submitted, error } = useApplication("/api/apply/stylist");

  const [form, setForm] = useState({
    display_name: "",
    contact_name: "",
    email: "",
    phone: "",
    city: "",
    neighborhood: "",
    salon_name: "",
    website: "",
    instagram: "",
    years_experience: "",
    bio: "",
    why_qoyl: "",
  });
  const [hairTypesServed, setHairTypesServed] = useState<string[]>([]);

  function update<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleHairType(type: string) {
    setHairTypesServed((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  }

  if (submitted) return <SuccessScreen email={form.email} />;

  const text = (key: keyof typeof form, extra: { type?: string; placeholder?: string; required?: boolean } = {}) => (
    <input
      type={extra.type ?? "text"}
      required={extra.required}
      placeholder={extra.placeholder}
      value={form[key]}
      onChange={(e) => update(key, e.target.value)}
      className={inputClass}
    />
  );

  return (
    <ApplyShell
      label="stylist application"
      title="apply as a stylist"
      price={`${STYLIST_PLAN.price} · no booking fees · no commission`}
      intro="see what your potential clients are matching with each month, and get discovered when qoyl users find a style that needs a pro."
    >
      <form onSubmit={(e) => submit(e, { ...form, hair_types_served: hairTypesServed })} className="space-y-6">
        <Field label="display name" required>{text("display_name", { required: true })}</Field>
        <Field label="contact name" required>{text("contact_name", { required: true })}</Field>
        <Field label="email" required>{text("email", { type: "email", required: true })}</Field>
        <Field label="phone">{text("phone", { type: "tel" })}</Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="city" required>{text("city", { required: true })}</Field>
          <Field label="neighborhood">{text("neighborhood")}</Field>
        </div>

        <Field label="salon name">{text("salon_name")}</Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="website">{text("website", { placeholder: "https://" })}</Field>
          <Field label="instagram">{text("instagram", { placeholder: "@yourhandle" })}</Field>
        </div>

        <Field label="years of experience">
          <input
            type="number"
            min={0}
            value={form.years_experience}
            onChange={(e) => update("years_experience", e.target.value)}
            className={inputClass}
          />
        </Field>

        <div>
          <span className="mb-2 block text-[10px] lowercase tracking-[0.12em] text-[#666]" style={{ fontFamily: "var(--font-mono-apply), monospace" }}>
            hair types you serve
          </span>
          <div className="flex flex-wrap gap-2">
            {HAIR_TYPES.map((type) => (
              <button
                type="button"
                key={type}
                onClick={() => toggleHairType(type)}
                aria-pressed={hairTypesServed.includes(type)}
                className={`border border-[#0a0a0a] px-3 py-1.5 text-xs lowercase transition-colors ${
                  hairTypesServed.includes(type)
                    ? "bg-[#0a0a0a] text-white"
                    : "bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]"
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <Field label="bio">
          <textarea rows={4} value={form.bio} onChange={(e) => update("bio", e.target.value)} className={inputClass} />
        </Field>
        <Field label="why qoyl?">
          <textarea rows={3} value={form.why_qoyl} onChange={(e) => update("why_qoyl", e.target.value)} className={inputClass} />
        </Field>

        <ApplyError message={error} />
        <SubmitButton submitting={submitting} />
      </form>
    </ApplyShell>
  );
}
