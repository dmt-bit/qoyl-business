"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { useBrandSession } from "@/lib/brandSession";

const CATEGORIES = [
  "shampoo",
  "conditioner",
  "leave-in",
  "styler",
  "treatment",
  "oil",
  "other",
];

export default function AddProductPage() {
  const router = useRouter();
  const { loading: sessionLoading, account } = useBrandSession();

  const [productName, setProductName] = useState("");
  const [category, setCategory] = useState("");
  const [ingredientList, setIngredientList] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!account) return;

    setSubmitting(true);
    setError(null);

    const { data, error: insertError } = await supabase
      .from("brand_products")
      .insert({
        brand_id: account.id,
        product_name: productName,
        category: category || null,
        ingredient_list: ingredientList,
      })
      .select("id")
      .single();

    setSubmitting(false);

    if (insertError || !data) {
      setError("Something went wrong saving your product. Please try again.");
      return;
    }

    router.push(`/products/${data.id}`);
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
          We&apos;ll score every ingredient against real consumer hair
          profiles.
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
            <span className="mb-2 block text-sm text-sand">Category</span>
            <select
              required
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className={inputClass}
            >
              <option value="">Select one</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-2 block text-sm text-sand">
              Paste your full INCI ingredient list exactly as it appears on
              your label
            </span>
            <textarea
              required
              rows={8}
              value={ingredientList}
              onChange={(e) => setIngredientList(e.target.value)}
              placeholder="Water, Cocos Nucifera (Coconut) Oil, Glycerin, ..."
              className={inputClass}
            />
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
