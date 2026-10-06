import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sendEmail } from "@/lib/email";
import { BRAND_PLAN } from "@/lib/accountTypes";
import { brandActivationEmail } from "@/lib/emailTemplates";
import { firstNameOf, generateSignInLink, siteUrl } from "@/lib/brandSignup";

// Brand subscription webhook (Payment Links from the self-serve signup email).
// Verifies the Stripe signature with STRIPE_BRAND_WEBHOOK_SECRET - the
// signature check needs no Stripe API key, since every field we use is in
// the event payload. Separate endpoint from qoyl-beta's routine webhook so
// the two Stripe destinations can't affect each other.
//
// Matching a payment to a brand account goes through client_reference_id,
// which startBrandSignup appends to each Payment Link URL (see
// lib/accountTypes.ts). The amount identifies the plan.
//
// Response policy: anything that means the account is still unpaid returns
// 500 so Stripe retries. Once the account is active, nothing downstream (magic
// link, email, analytics) can make Stripe retry -- those failures are logged.

export const dynamic = "force-dynamic";

// The one brand plan ($50/month) in cents. Anything else is not a brand plan.
function tierForAmount(cents: number | null | undefined): string | null {
  if (cents == null) return null;
  return cents === BRAND_PLAN.cents ? BRAND_PLAN.dbTier : null;
}

async function logEvent(eventType: string, brandAccountId: string | null, metadata: Record<string, unknown>) {
  // Best-effort analytics write - never fails the webhook.
  const { error } = await getSupabaseAdmin().from("ml_events").insert({
    event_type: eventType,
    user_id: null,
    metadata: { brand_account_id: brandAccountId, ...metadata },
  });
  if (error) console.error(`[brand-stripe] ml_event ${eventType} failed:`, error.message);
}

async function emailBrand(to: string, subject: string, text: string) {
  const result = await sendEmail({ to, subject, text });
  if (!result.sent) console.error("[brand-stripe] email failed:", to, result.error);
}

// Runs after the account is active. Never throws: every failure is logged and
// the webhook still answers 200.
async function sendActivationEmail(account: {
  email: string;
  contact_name: string;
  company_name: string;
  product_to_score: string | null;
}) {
  const loginUrl = `${siteUrl()}/login`;
  let magicLinkUrl = loginUrl;
  let magicLinkGenerated = false;
  try {
    magicLinkUrl = await generateSignInLink(account.email, "/dashboard");
    magicLinkGenerated = true;
  } catch (err) {
    console.error("Magic link generation failed:", err instanceof Error ? err.message : err);
  }
  console.log("Magic link generated:", magicLinkGenerated);

  try {
    const mail = brandActivationEmail({
      firstName: firstNameOf(account.contact_name),
      brandName: account.company_name,
      productToScore: account.product_to_score?.trim() || "your product",
      magicLinkUrl,
      loginUrl,
    });
    const result = await sendEmail({ to: account.email, ...mail });
    console.log("Activation email sent:", result.sent ? "yes" : `no: ${result.error}`);
    if (!result.sent) console.error("[brand-stripe] activation email failed:", result.error);
  } catch (err) {
    console.error("Activation email error:", err);
  }
}

export async function POST(request: Request) {
  const secret = process.env.STRIPE_BRAND_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured." }, { status: 503 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature." }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (err) {
    console.error("[brand-stripe] signature verification failed:", err instanceof Error ? err.message : err);
    return NextResponse.json({ error: "Invalid signature." }, { status: 400 });
  }

  console.log("Webhook received:", event.type);

  try {
    return await handleEvent(event);
  } catch (err) {
    // Reached only before the account is activated (activation errors are
    // handled inside handleEvent), so Stripe should retry.
    console.error("Webhook handler error:", err);
    return NextResponse.json({ error: "Webhook handler error." }, { status: 500 });
  }
}

async function handleEvent(event: Stripe.Event): Promise<NextResponse> {
  const admin = getSupabaseAdmin();

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const brandAccountId = session.client_reference_id;
      console.log("client_reference_id:", brandAccountId);

      if (!brandAccountId) {
        // Not one of ours (no signup-email link) - acknowledge so Stripe
        // doesn't retry forever.
        console.error("[brand-stripe] checkout without client_reference_id:", session.id);
        return NextResponse.json({ received: true, skipped: "no_client_reference_id" });
      }
      console.log("Brand account id:", brandAccountId);

      const tier = tierForAmount(session.amount_total);
      const { data: account, error } = await admin
        .from("brand_accounts")
        .update({
          status: "active",
          stripe_customer_id: typeof session.customer === "string" ? session.customer : session.customer?.id ?? null,
          stripe_subscription_id:
            typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null,
          activated_at: new Date().toISOString(),
          ...(tier ? { plan_tier: tier, plan_price_cents: session.amount_total } : {}),
        })
        .eq("id", brandAccountId)
        .select("email, company_name, contact_name, product_to_score")
        .maybeSingle();

      if (error) {
        // 500 so Stripe retries - the account must not stay unpaid.
        console.error("Status update result: error:", error.message);
        return NextResponse.json({ error: "Activation update failed." }, { status: 500 });
      }
      if (!account) {
        console.log("Status update result: no matching row");
        console.error("Brand account not found after activation:", brandAccountId);
        return NextResponse.json({ received: true, skipped: "unknown_brand_account" });
      }
      console.log("Status update result: active");

      // The account is active. From here on, failures are logged, not retried.
      await sendActivationEmail(account);

      await logEvent("brand_subscription_activated", brandAccountId, {
        stripe_session_id: session.id,
        amount_cents: session.amount_total,
        tier,
      });
      return NextResponse.json({ received: true });
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const cents = sub.items.data[0]?.price?.unit_amount ?? null;
      const tier = tierForAmount(cents);
      if (!tier) {
        // Unknown price (e.g. a retired or custom plan) - keep the current
        // tier rather than guessing.
        console.error("[brand-stripe] subscription price not mapped to a tier:", sub.id, cents);
        return NextResponse.json({ received: true, skipped: "unmapped_price" });
      }
      const { error } = await admin
        .from("brand_accounts")
        .update({ plan_tier: tier, plan_price_cents: cents })
        .eq("stripe_subscription_id", sub.id);
      if (error) {
        console.error("[brand-stripe] plan update failed:", error.message);
        return NextResponse.json({ error: "Plan update failed." }, { status: 500 });
      }
      return NextResponse.json({ received: true });
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const { data: account, error } = await admin
        .from("brand_accounts")
        .update({ status: "cancelled" })
        .eq("stripe_subscription_id", sub.id)
        .select("id, email, company_name, contact_name")
        .maybeSingle();
      if (error) {
        console.error("[brand-stripe] cancellation update failed:", error.message);
        return NextResponse.json({ error: "Cancellation update failed." }, { status: 500 });
      }
      if (account) {
        // Data is kept - only dashboard access is removed (see the brand
        // layout's status gate).
        await emailBrand(
          account.email,
          "your qoyl subscription has ended",
          `Hi ${account.contact_name},

Your qoyl brand subscription for ${account.company_name} has ended, so dashboard access is paused.
Your data is kept. If you want to come back, reply to this email and we'll set you up again.

D
Founder, Qoyl`
        );
        await logEvent("brand_subscription_cancelled", account.id, { stripe_subscription_id: sub.id });
      }
      return NextResponse.json({ received: true });
    }

    default:
      // Other events aren't used by the brand flow.
      return NextResponse.json({ received: true });
  }
}
