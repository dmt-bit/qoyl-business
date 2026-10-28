"use client";

import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useApplication } from "@/components/apply/ui";

const MONO = "font-[family-name:var(--font-mono-apply)]";
const inputClass =
  "w-full border border-[#0a0a0a] bg-white px-4 py-3 text-sm font-light text-[#0a0a0a] placeholder:text-[#aaa] focus:outline-none focus:ring-1 focus:ring-[#0a0a0a]";

const PLAN_LABELS: Record<string, string> = {
  stylist: "stylist",
  "hair-seller": "hair seller",
  brand: "brand",
};

const HAIR_TYPES = ["1a", "1b", "1c", "2a", "2b", "2c", "3a", "3b", "3c", "4a", "4b", "4c"];

export default function WelcomePage() {
  return (
    <Suspense fallback={null}>
      <WelcomeForm />
    </Suspense>
  );
}

function WelcomeForm() {
  const searchParams = useSearchParams();
  // {PLAN} isn't a real Stripe template token (only {CHECKOUT_SESSION_ID} is) --
  // each Payment Link's success_url needs its own literal ?plan=stylist/
  // hair-seller/brand set in the Stripe dashboard. Unrecognized/missing falls
  // back to "brand" rather than crashing the page.
  const planParam = searchParams.get("plan");
  const plan = planParam && PLAN_LABELS[planParam] ? planParam : "brand";
  const planLabel = PLAN_LABELS[plan];
  const sessionId = searchParams.get("session_id");

  const { submit, submitting, submitted, error } = useApplication("/api/vendor-profiles");
  const [form, setForm] = useState({
    contact_name: "",
    user_email: "",
    business_name: "",
    location: "",
    // hair seller
    hair_types: [] as string[],
    textures: "",
    // stylist
    specialties: "",
    booking_link: "",
    // brand
    product_categories: "",
  });

  function update<K extends keyof typeof form>(key: K, value: (typeof form)[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function toggleHairType(type: string) {
    setForm((prev) => ({
      ...prev,
      hair_types: prev.hair_types.includes(type) ? prev.hair_types.filter((t) => t !== type) : [...prev.hair_types, type],
    }));
  }

  function handleSubmit(e: React.FormEvent) {
    const profile_data: Record<string, unknown> = { contact_name: form.contact_name };
    if (plan === "hair-seller") {
      profile_data.hair_types = form.hair_types;
      profile_data.textures = form.textures;
    } else if (plan === "stylist") {
      profile_data.specialties = form.specialties;
      profile_data.booking_link = form.booking_link;
    } else {
      profile_data.product_categories = form.product_categories;
    }

    submit(e, {
      plan_type: plan,
      user_email: form.user_email,
      business_name: form.business_name,
      location: form.location,
      session_id: sessionId,
      profile_data,
    });
  }

  if (submitted) {
    return (
      <main className="flex min-h-screen items-center justify-center px-6">
        <div className="max-w-sm text-center">
          <p className={`${MONO} text-[10px] lowercase tracking-[0.18em] text-[#aaa]`}>profile saved</p>
          <h1 className="mt-4 text-3xl font-bold lowercase tracking-[-1px]">you&apos;re all set.</h1>
          <p className="mt-4 text-sm font-light leading-relaxed text-[#666]">
            we review every new {planLabel} profile before it goes live — you&apos;ll hear from us within 48 hours.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-lg px-6 py-16 sm:px-10">
      <p className={`${MONO} text-[10px] lowercase tracking-[0.18em] text-[#aaa]`}>payment confirmed</p>
      <h1 className="mt-4 text-3xl font-bold lowercase leading-[1.1] tracking-[-1px] sm:text-4xl">
        you&apos;re in. welcome to qoyl.
      </h1>
      <p className="mt-2 text-sm font-light text-[#666]">
        {planLabel} plan · first month free
      </p>

      <p className="mt-8 text-sm font-light leading-relaxed text-[#666]">
        a few details so we can get your {planLabel} profile live and matching.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <label className="block">
          <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>your name</span>
          <input type="text" required value={form.contact_name} onChange={(e) => update("contact_name", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>email</span>
          <input type="email" required value={form.user_email} onChange={(e) => update("user_email", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>business name</span>
          <input type="text" required value={form.business_name} onChange={(e) => update("business_name", e.target.value)} className={inputClass} />
        </label>
        <label className="block">
          <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>location</span>
          <input type="text" required placeholder="city, state" value={form.location} onChange={(e) => update("location", e.target.value)} className={inputClass} />
        </label>

        {plan === "hair-seller" && (
          <>
            <div>
              <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>hair types you carry</span>
              <div className="flex flex-wrap gap-2">
                {HAIR_TYPES.map((type) => (
                  <button
                    type="button"
                    key={type}
                    onClick={() => toggleHairType(type)}
                    aria-pressed={form.hair_types.includes(type)}
                    className={`border border-[#0a0a0a] px-3 py-1.5 text-xs lowercase transition-colors ${
                      form.hair_types.includes(type) ? "bg-[#0a0a0a] text-white" : "bg-white text-[#0a0a0a] hover:bg-[#f5f5f5]"
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
            <label className="block">
              <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>textures you carry</span>
              <input
                type="text"
                placeholder="e.g. kinky straight, body wave, yaki"
                value={form.textures}
                onChange={(e) => update("textures", e.target.value)}
                className={inputClass}
              />
            </label>
          </>
        )}

        {plan === "stylist" && (
          <>
            <label className="block">
              <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>specialties</span>
              <input
                type="text"
                placeholder="e.g. knotless braids, u-part wigs, silk press"
                value={form.specialties}
                onChange={(e) => update("specialties", e.target.value)}
                className={inputClass}
              />
            </label>
            <label className="block">
              <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>booking link</span>
              <input type="text" placeholder="https://" value={form.booking_link} onChange={(e) => update("booking_link", e.target.value)} className={inputClass} />
            </label>
          </>
        )}

        {plan === "brand" && (
          <label className="block">
            <span className={`${MONO} mb-2 block text-[10px] lowercase tracking-[0.1em] text-[#666]`}>product categories</span>
            <input
              type="text"
              placeholder="e.g. edge control, leave-in conditioner, bonding glue"
              value={form.product_categories}
              onChange={(e) => update("product_categories", e.target.value)}
              className={inputClass}
            />
          </label>
        )}

        {error && (
          <p className="border border-[#0a0a0a] bg-[#f5f5f5] px-4 py-3 text-sm" role="alert">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full bg-[#0a0a0a] px-8 py-4 text-sm font-semibold lowercase tracking-[0.02em] text-white transition-opacity hover:opacity-80 disabled:opacity-50"
        >
          {submitting ? "saving…" : "complete my profile →"}
        </button>
      </form>
    </main>
  );
}
