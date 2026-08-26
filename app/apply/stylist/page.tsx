"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

const HAIR_TYPES = [
  "1a", "1b", "1c",
  "2a", "2b", "2c",
  "3a", "3b", "3c",
  "4a", "4b", "4c",
];

export default function ApplyStylistPage() {
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("stylist_applications").insert({
      display_name: form.display_name,
      contact_name: form.contact_name,
      email: form.email,
      phone: form.phone || null,
      city: form.city,
      neighborhood: form.neighborhood || null,
      salon_name: form.salon_name || null,
      website: form.website || null,
      instagram: form.instagram || null,
      years_experience: form.years_experience ? Number(form.years_experience) : null,
      hair_types_served: hairTypesServed.length > 0 ? hairTypesServed : null,
      bio: form.bio || null,
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
          <h1 className="font-serif text-3xl text-cream">Application received</h1>
          <p className="mt-4 text-sand leading-relaxed">
            We review every application personally and will be in touch within 48
            hours.
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

        <p className="mt-6 inline-block rounded-full border border-bronze/40 bg-bronze/10 px-4 py-1.5 text-xs uppercase tracking-wider text-bronze2">
          Stylist application
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl text-cream mt-4">
          Apply as a stylist
        </h1>
        <p className="mt-3 text-sand leading-relaxed">
          See what your potential clients are matching with each month, and get
          discovered when Qoyl consumers find a style that needs a pro.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <Field label="Display name" required>
            <input
              type="text"
              required
              value={form.display_name}
              onChange={(e) => update("display_name", e.target.value)}
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

          <Field label="Phone">
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => update("phone", e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="City" required>
              <input
                type="text"
                required
                value={form.city}
                onChange={(e) => update("city", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Neighborhood">
              <input
                type="text"
                value={form.neighborhood}
                onChange={(e) => update("neighborhood", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Salon name">
            <input
              type="text"
              value={form.salon_name}
              onChange={(e) => update("salon_name", e.target.value)}
              className={inputClass}
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Website">
              <input
                type="text"
                placeholder="https://"
                value={form.website}
                onChange={(e) => update("website", e.target.value)}
                className={inputClass}
              />
            </Field>
            <Field label="Instagram">
              <input
                type="text"
                placeholder="@yourhandle"
                value={form.instagram}
                onChange={(e) => update("instagram", e.target.value)}
                className={inputClass}
              />
            </Field>
          </div>

          <Field label="Years of experience">
            <input
              type="number"
              min={0}
              value={form.years_experience}
              onChange={(e) => update("years_experience", e.target.value)}
              className={inputClass}
            />
          </Field>

          <div>
            <span className="mb-2 block text-sm text-sand">Hair types you serve</span>
            <div className="flex flex-wrap gap-2">
              {HAIR_TYPES.map((type) => (
                <button
                  type="button"
                  key={type}
                  onClick={() => toggleHairType(type)}
                  className={`rounded-full px-3 py-1.5 text-xs uppercase tracking-wider transition-colors ${
                    hairTypesServed.includes(type)
                      ? "bg-bronze text-dark"
                      : "bg-warm/[0.05] text-muted hover:bg-warm/10 hover:text-sand"
                  }`}
                >
                  {type}
                </button>
              ))}
            </div>
          </div>

          <Field label="Bio">
            <textarea
              rows={4}
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              className={inputClass}
            />
          </Field>

          <Field label="Why Qoyl?">
            <textarea
              rows={3}
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
