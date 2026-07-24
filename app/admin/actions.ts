"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

function generateTempPassword(): string {
  return "Qoyl" + Math.random().toString(36).slice(2, 8).toUpperCase() + "!";
}

function approvalEmailBody(params: {
  contactName: string;
  email: string;
  tempPassword: string;
  siteUrl: string;
}): string {
  return `Hi ${params.contactName},

Welcome to Qoyl — your brand intelligence dashboard is ready.

Login at: ${params.siteUrl}/login
Email: ${params.email}
Temporary password: ${params.tempPassword}

Please change your password after your first login by clicking "Forgot password" on the login page.

Your dashboard gives you access to:
→ Ingredient performance scores for your products
→ Consumer demand signals from real Qoyl users
→ Reformulation recommendations

To get started, log in and add your first product under "My Products."

Questions? Reply to this email — we're here.

D
Founder, Qoyl`;
}

// Best-effort -- a failed send shouldn't undo the account/auth-user that
// were already created. Callers check the return value to warn the admin.
async function sendApprovalEmail(params: {
  email: string;
  contactName: string;
  tempPassword: string;
}): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001";

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "onboarding@resend.dev",
      to: params.email,
      subject: "Your Qoyl Brand Dashboard is approved",
      text: approvalEmailBody({ ...params, siteUrl }),
    }),
  });

  return res.ok;
}

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

  const tempPassword = generateTempPassword();

  const { error: authError } = await supabaseAdmin.auth.admin.createUser({
    email: application.email,
    password: tempPassword,
    email_confirm: true,
  });

  if (authError) {
    throw new Error(authError.message);
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

  const emailSent = await sendApprovalEmail({
    email: application.email,
    contactName: application.contact_name,
    tempPassword,
  });

  const params = new URLSearchParams({
    password,
    approved_email: application.email,
    email_sent: emailSent ? "1" : "0",
  });
  redirect(`/admin?${params.toString()}`);
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
