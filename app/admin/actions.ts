"use server";

import { redirect } from "next/navigation";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { approvalEmail, type EmailContent } from "@/lib/emailTemplates";
import { paymentOptionsFor } from "@/lib/accountTypes";
import { sendBrandPaymentEmail, type BrandAccountRow } from "@/lib/brandSignup";

function generateTempPassword(): string {
  return "Qoyl" + Math.random().toString(36).slice(2, 8).toUpperCase() + "!";
}

// Best-effort -- a failed send shouldn't undo the account/auth-user that
// were already created. Never throws; always reports what happened so the
// caller can log it and tell the admin.
async function sendApprovalEmail(params: {
  email: string;
  content: EmailContent;
  applicationId: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const result = await sendEmail({ to: params.email, ...params.content });
  if (!result.sent) {
    console.error("[approveApplication] email not sent", {
      applicationId: params.applicationId,
      error: result.error,
    });
  }
  return result;
}

type ApprovalStatus = "ok" | "email_failed" | "auth_failed" | "account_failed" | "not_found";

export async function approveFakeHairBrandApplication(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") {
    throw new Error("Missing application id");
  }

  let approvalStatus: ApprovalStatus = "ok";
  let approvedEmail: string | null = null;
  let errorDetail: string | null = null;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: application, error: fetchError } = await supabaseAdmin
      .from("fake_hair_brand_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      console.error("[approveFakeHairBrandApplication] application not found", {
        id,
        error: fetchError?.message,
      });
      approvalStatus = "not_found";
    } else {
      approvedEmail = application.email;
      const tempPassword = generateTempPassword();
      let authCreated = false;

      try {
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: application.email,
          password: tempPassword,
          email_confirm: true,
        });
        if (authError) throw authError;
        authCreated = true;
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : String(err);
        console.error("[approveFakeHairBrandApplication] auth.admin.createUser failed", {
          applicationId: id,
          email: application.email,
          error: errorDetail,
        });
      }

      const { error: insertError } = await supabaseAdmin.from("fake_hair_brand_accounts").insert({
        company_name: application.company_name,
        contact_name: application.contact_name,
        email: application.email,
        website: application.website,
        instagram_handle: application.instagram_handle,
        tier: application.tier ?? "standard",
        product_types: application.product_types,
        styles_served: application.styles_served,
        status: "active",
        approved_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabaseAdmin
        .from("fake_hair_brand_applications")
        .update({ status: "approved" })
        .eq("id", id);

      if (insertError || updateError) {
        errorDetail = insertError?.message ?? updateError?.message ?? errorDetail;
        console.error(
          "[approveFakeHairBrandApplication] fake_hair_brand_accounts/applications write failed",
          {
            applicationId: id,
            email: application.email,
            insertError: insertError?.message,
            updateError: updateError?.message,
          }
        );
        approvalStatus = "account_failed";
      } else if (!authCreated) {
        approvalStatus = "auth_failed";
      } else {
        const { sent, error: emailError } = await sendApprovalEmail({
          email: application.email,
          content: approvalEmail({
            type: "hair_seller",
            contactName: application.contact_name,
            email: application.email,
            tempPassword,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
            payment: paymentOptionsFor("hair_seller", application.email),
          }),
          applicationId: id,
        });

        if (!sent) {
          errorDetail = emailError;
          console.error("[approveFakeHairBrandApplication] manual credential handoff needed", {
            applicationId: id,
            email: application.email,
            tempPassword,
          });
          approvalStatus = "email_failed";
        }
      }
    }
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : String(err);
    console.error("[approveFakeHairBrandApplication] unexpected error", { id, error: errorDetail });
    approvalStatus = "account_failed";
  }

  const redirectParams = new URLSearchParams({
    password,
    approval_status: approvalStatus,
    tab: "hair_sellers",
  });
  if (approvedEmail) redirectParams.set("approved_email", approvedEmail);
  if (errorDetail) redirectParams.set("error_detail", errorDetail.slice(0, 300));
  redirect(`/admin?${redirectParams.toString()}`);
}

export async function rejectFakeHairBrandApplication(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") {
    throw new Error("Missing application id");
  }

  const { error } = await getSupabaseAdmin()
    .from("fake_hair_brand_applications")
    .update({ status: "rejected" })
    .eq("id", id);
  if (error) {
    console.error("[rejectFakeHairBrandApplication] update failed", { id, error: error.message });
  }

  redirect(`/admin?password=${encodeURIComponent(password)}&tab=hair_sellers`);
}

export async function approveStylistApplication(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");

  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") {
    throw new Error("Missing application id");
  }

  let approvalStatus: ApprovalStatus = "ok";
  let approvedEmail: string | null = null;
  let errorDetail: string | null = null;

  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: application, error: fetchError } = await supabaseAdmin
      .from("stylist_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      console.error("[approveStylistApplication] application not found", {
        id,
        error: fetchError?.message,
      });
      approvalStatus = "not_found";
    } else {
      approvedEmail = application.email;
      const tempPassword = generateTempPassword();
      let authCreated = false;

      try {
        const { error: authError } = await supabaseAdmin.auth.admin.createUser({
          email: application.email,
          password: tempPassword,
          email_confirm: true,
        });
        if (authError) throw authError;
        authCreated = true;
      } catch (err) {
        errorDetail = err instanceof Error ? err.message : String(err);
        console.error("[approveStylistApplication] auth.admin.createUser failed", {
          applicationId: id,
          email: application.email,
          error: errorDetail,
        });
      }

      const { error: insertError } = await supabaseAdmin.from("stylist_accounts").insert({
        display_name: application.display_name,
        contact_name: application.contact_name,
        email: application.email,
        phone: application.phone,
        city: application.city,
        neighborhood: application.neighborhood,
        salon_name: application.salon_name,
        website: application.website,
        instagram: application.instagram,
        years_experience: application.years_experience,
        hair_types_served: application.hair_types_served,
        bio: application.bio,
        status: "approved",
        approved_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabaseAdmin
        .from("stylist_applications")
        .update({ status: "approved" })
        .eq("id", id);

      if (insertError || updateError) {
        errorDetail = insertError?.message ?? updateError?.message ?? errorDetail;
        console.error("[approveStylistApplication] stylist_accounts/applications write failed", {
          applicationId: id,
          email: application.email,
          insertError: insertError?.message,
          updateError: updateError?.message,
        });
        approvalStatus = "account_failed";
      } else if (!authCreated) {
        approvalStatus = "auth_failed";
      } else {
        const { sent, error: emailError } = await sendApprovalEmail({
          email: application.email,
          content: approvalEmail({
            type: "stylist",
            contactName: application.contact_name,
            email: application.email,
            tempPassword,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
            payment: paymentOptionsFor("stylist", application.email),
          }),
          applicationId: id,
        });

        if (!sent) {
          errorDetail = emailError;
          console.error("[approveStylistApplication] manual credential handoff needed", {
            applicationId: id,
            email: application.email,
            tempPassword,
          });
          approvalStatus = "email_failed";
        }
      }
    }
  } catch (err) {
    errorDetail = err instanceof Error ? err.message : String(err);
    console.error("[approveStylistApplication] unexpected error", { id, error: errorDetail });
    approvalStatus = "account_failed";
  }

  const redirectParams = new URLSearchParams({
    password,
    approval_status: approvalStatus,
    tab: "stylist_applications",
  });
  if (approvedEmail) redirectParams.set("approved_email", approvedEmail);
  if (errorDetail) redirectParams.set("error_detail", errorDetail.slice(0, 300));
  redirect(`/admin?${redirectParams.toString()}`);
}

// Brands no longer go through approval. The admin's job is support: re-send a
// payment link to someone stuck in pending_payment, or cancel an account.
export async function resendBrandPaymentLink(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") throw new Error("Missing account id");

  const { data: account } = await getSupabaseAdmin()
    .from("brand_accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (account?.status === "pending_payment") {
    await sendBrandPaymentEmail(account as BrandAccountRow);
  }
  redirect(`/admin?password=${encodeURIComponent(password)}&tab=brand_accounts`);
}

export async function cancelBrandAccount(formData: FormData) {
  const id = formData.get("id");
  const password = formData.get("password");
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") throw new Error("Missing account id");

  const { error } = await getSupabaseAdmin().from("brand_accounts").update({ status: "cancelled" }).eq("id", id);
  if (error) console.error("[cancelBrandAccount] update failed", { id, error: error.message });
  redirect(`/admin?password=${encodeURIComponent(password)}&tab=brand_accounts`);
}

// Admin's main job now: attach each brand account to its catalog brand, so its
// products show on the dashboard. An empty catalogBrandId unlinks it.
export async function matchBrandAccount(formData: FormData) {
  const id = formData.get("id");
  const catalogBrandId = formData.get("catalogBrandId");
  const password = formData.get("password");
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string") throw new Error("Missing account id");

  const brandId = typeof catalogBrandId === "string" && catalogBrandId ? catalogBrandId : null;
  const { error } = await getSupabaseAdmin().from("brand_accounts").update({ brand_id: brandId }).eq("id", id);
  if (error) console.error("[matchBrandAccount] update failed", { id, error: error.message });
  redirect(`/admin?password=${encodeURIComponent(password)}&tab=brand_accounts`);
}

export async function setProductRequestStatus(formData: FormData) {
  const id = formData.get("id");
  const status = formData.get("status");
  const password = formData.get("password");
  if (typeof password !== "string" || password !== process.env.ADMIN_PASSWORD) {
    throw new Error("Unauthorized");
  }
  if (typeof id !== "string" || (status !== "added" && status !== "declined")) {
    throw new Error("Invalid request update");
  }

  const { error } = await getSupabaseAdmin().from("brand_product_requests").update({ status }).eq("id", id);
  if (error) console.error("[setProductRequestStatus] update failed", { id, error: error.message });
  redirect(`/admin?password=${encodeURIComponent(password)}&tab=product_requests`);
}
