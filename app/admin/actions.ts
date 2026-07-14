"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

export async function approveApplication(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") {
    throw new Error("Missing application id");
  }

  const supabaseAdmin = getSupabaseAdmin();

  const { data: application, error: fetchError } = await supabaseAdmin
    .from("brand_applications")
    .select("*")
    .eq("id", id)
    .single();

  if (fetchError || !application) {
    throw new Error("Application not found");
  }

  const { error: insertError } = await supabaseAdmin.from("brand_accounts").insert({
    company_name: application.company_name,
    contact_name: application.contact_name,
    email: application.email,
    website: application.website,
    instagram_handle: application.instagram_handle,
    status: "approved",
    approved_at: new Date().toISOString(),
  });

  if (insertError) {
    throw new Error(insertError.message);
  }

  const { error: updateError } = await supabaseAdmin
    .from("brand_applications")
    .update({ status: "approved" })
    .eq("id", id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  redirect(`/admin?password=${encodeURIComponent(password)}`);
}

const VALID_TIERS = new Set(["early_stage", "growth", "enterprise"]);

export async function updateBrandTier(formData: FormData) {
  const id = formData.get("id");
  const tier = formData.get("tier");
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string" || typeof tier !== "string" || !VALID_TIERS.has(tier)) {
    throw new Error("Invalid tier update");
  }

  const supabaseAdmin = getSupabaseAdmin();
  const { error } = await supabaseAdmin.from("brand_accounts").update({ tier }).eq("id", id);

  if (error) {
    throw new Error(error.message);
  }

  redirect(`/admin?password=${encodeURIComponent(password)}&tab=accounts`);
}
