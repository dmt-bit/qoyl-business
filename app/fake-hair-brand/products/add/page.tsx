"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useFakeHairBrandSession } from "@/lib/fakeHairBrandSession";

type StyleOption = { id: string; name: string };

export default function AddFakeHairProductPage() {
  const router = useRouter();
  const { loading: sessionLoading, account } = useFakeHairBrandSession();

  const [styles, setStyles] = useState<StyleOption[]>([]);
  const [stylesError, setStylesError] = useState(false);

  const [productName, setProductName] = useState("");
  const [productUrl, setProductUrl] = useState("");
  const [styleId, setStyleId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from("styles")
      .select("id, name")
      .order("name")
      .then(({ data, error: fetchError }) => {
        if (fetchError || !data) {
          setStylesError(true);
          return;
        }
        setStyles(data);
      });
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;

    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from("fake_hair_products").insert({
      brand_id: account.id,
      product_name: productName,
      product_url: productUrl || null,
      style_id: styleId || null,
    });

    setSubmitting(false);

    if (insertError) {
      setError("Something went wrong saving your product. Please try again.");
      return;
    }

    router.push("/fake-hair-brand/dashboard");
  }

  if (sessionLoading || !account) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted">Loading...</p>
      </div>
    );
  }

  return (
    <div className="px-6 py-12 sm:px-12">
      <div className="mx-auto max-w-xl">
        <h1 className="font-serif text-3xl text-cream">Add a product</h1>
        <p className="mt-3 text-sand leading-relaxed">
          Tie your product to the style it&apos;s meant for, so brands and consumers
          can find it.
        </p>

        <form onSubmit={handleSubmit} className="mt-10 space-y-6">
          <label className="block">
            <span className="mb-2 block text-sm text-sand">Product name</span>
            <input
              type="text"
              required
              value={productName}
              onChange={(e) => setProductName(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-sand">Product URL</span>
            <input
              type="text"
              placeholder="https://"
              value={productUrl}
              onChange={(e) => setProductUrl(e.target.value)}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-sand">Style</span>
            <select
              value={styleId}
              onChange={(e) => setStyleId(e.target.value)}
              className={inputClass}
              disabled={stylesError}
            >
              <option value="">Select a style</option>
              {styles.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {stylesError && (
              <span className="mt-2 block text-xs text-red">
                Couldn&apos;t load the style catalog. Try again shortly.
              </span>
            )}
          </label>

          {error && <p className="text-sm text-red">{error}</p>}

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-full bg-bronze px-8 py-4 text-sm font-medium uppercase tracking-wider text-dark transition-colors hover:bg-bronze2 disabled:opacity-50"
          >
            {submitting ? "Saving..." : "Save product"}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputClass =
  "w-full rounded-md border border-warm/15 bg-warm/[0.04] px-4 py-3 text-cream placeholder:text-muted focus:border-bronze focus:outline-none";
