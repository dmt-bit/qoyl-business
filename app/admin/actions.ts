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

function fakeHairBrandApprovalEmailBody(params: {
  contactName: string;
  email: string;
  tempPassword: string;
  siteUrl: string;
}): string {
  return `Hi ${params.contactName},

Welcome to Qoyl — your fake hair brand dashboard is ready.

Login at: ${params.siteUrl}/login
Email: ${params.email}
Temporary password: ${params.tempPassword}

Please change your password after your first login by clicking "Forgot password" on the login page.

Your dashboard gives you access to:
→ Which protective styles feature your products
→ Click-through performance (live once Style Match integration ships)
→ Cities with the highest demand for your styles

To get started, log in and add your first product.

Questions? Reply to this email — we're here.

D
Founder, Qoyl`;
}

function stylistApprovalEmailBody(params: {
  contactName: string;
  email: string;
  tempPassword: string;
  siteUrl: string;
}): string {
  return `Hi ${params.contactName},

Welcome to Qoyl — your stylist dashboard is ready.

Login at: ${params.siteUrl}/login
Email: ${params.email}
Temporary password: ${params.tempPassword}

Please change your password after your first login by clicking "Forgot password" on the login page.

Your dashboard gives you access to:
→ What your potential clients are matching with each month
→ Booking inquiries from consumers who chose you after a Style Match

Questions? Reply to this email — we're here.

D
Founder, Qoyl`;
}

// Best-effort -- a failed send shouldn't undo the account/auth-user that
// were already created. Never throws; always reports what happened so the
// caller can log it and tell the admin.
async function sendApprovalEmail(params: {
  email: string;
  subject: string;
  body: string;
  applicationId: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    const error = "RESEND_API_KEY is not set";
    console.error("[approveApplication] email not sent", {
      applicationId: params.applicationId,
      error,
    });
    return { sent: false, error };
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "onboarding@resend.dev",
        to: params.email,
        subject: params.subject,
        text: params.body,
      }),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const error = `Resend API responded ${res.status}: ${body.slice(0, 300)}`;
      console.error("[approveApplication] email not sent", {
        applicationId: params.applicationId,
        error,
      });
      return { sent: false, error };
    }

    return { sent: true, error: null };
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[approveApplication] email send threw", {
      applicationId: params.applicationId,
      error,
    });
    return { sent: false, error };
  }
}

type ApprovalStatus = "ok" | "email_failed" | "auth_failed" | "account_failed" | "not_found";

export async function approveApplication(formData: FormData) {
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

  // Every risky step below is isolated so one failure (a flaky Resend call,
  // GoTrue rejecting a duplicate email, etc.) can't crash the whole action
  // with Next's generic digest error -- which is what was happening in
  // production. redirect() is only ever called once, at the very end,
  // outside of any try/catch (it throws internally to perform the
  // navigation, and a surrounding catch would swallow that).
  try {
    const supabaseAdmin = getSupabaseAdmin();

    const { data: application, error: fetchError } = await supabaseAdmin
      .from("brand_applications")
      .select("*")
      .eq("id", id)
      .single();

    if (fetchError || !application) {
      console.error("[approveApplication] application not found", {
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
        console.error("[approveApplication] auth.admin.createUser failed", {
          applicationId: id,
          email: application.email,
          error: errorDetail,
        });
      }

      // Always persist the approval, regardless of the auth/email outcome
      // above -- an admin shouldn't be stuck re-clicking Approve forever
      // because Resend or GoTrue had a bad moment.
      const { error: insertError } = await supabaseAdmin.from("brand_accounts").insert({
        company_name: application.company_name,
        contact_name: application.contact_name,
        email: application.email,
        website: application.website,
        instagram_handle: application.instagram_handle,
        status: "approved",
        approved_at: new Date().toISOString(),
      });

      const { error: updateError } = await supabaseAdmin
        .from("brand_applications")
        .update({ status: "approved" })
        .eq("id", id);

      if (insertError || updateError) {
        errorDetail = insertError?.message ?? updateError?.message ?? errorDetail;
        console.error("[approveApplication] brand_accounts/brand_applications write failed", {
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
          subject: "Your Qoyl Brand Dashboard is approved",
          body: approvalEmailBody({
            contactName: application.contact_name,
            email: application.email,
            tempPassword,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
          }),
          applicationId: id,
        });

        if (!sent) {
          errorDetail = emailError;
          // The account and login both work -- just log the temp password
          // server-side so the admin can pull it from the logs and hand
          // it over manually, since it can't be shown in the URL/UI.
          console.error("[approveApplication] manual credential handoff needed", {
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
    console.error("[approveApplication] unexpected error", { id, error: errorDetail });
    approvalStatus = "account_failed";
  }

  const redirectParams = new URLSearchParams({ password, approval_status: approvalStatus });
  if (approvedEmail) redirectParams.set("approved_email", approvedEmail);
  if (errorDetail) redirectParams.set("error_detail", errorDetail.slice(0, 300));
  redirect(`/admin?${redirectParams.toString()}`);
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

  redirect(`/admin?password=${encodeURIComponent(password)}&tab=brand_accounts`);
}

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
        status: "approved",
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
          subject: "Your Qoyl Fake Hair Brand Dashboard is approved",
          body: fakeHairBrandApprovalEmailBody({
            contactName: application.contact_name,
            email: application.email,
            tempPassword,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
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
    tab: "fake_hair_applications",
  });
  if (approvedEmail) redirectParams.set("approved_email", approvedEmail);
  if (errorDetail) redirectParams.set("error_detail", errorDetail.slice(0, 300));
  redirect(`/admin?${redirectParams.toString()}`);
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
          subject: "Your Qoyl Stylist Dashboard is approved",
          body: stylistApprovalEmailBody({
            contactName: application.contact_name,
            email: application.email,
            tempPassword,
            siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001",
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
