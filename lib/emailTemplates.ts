import type { AccountType, PaymentOption } from "./accountTypes";

// HTML + plain-text bodies for every application/approval email. Inline
// styles only (email clients strip <style>), system fonts, black-on-white to
// match the /apply forms and the marketing pages. Every user-supplied value
// goes through esc() -- applicants control these strings.

export function esc(v: string): string {
  return v
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const FONT = "'Space Grotesk',Helvetica,Arial,sans-serif";
const MONO = "'Space Mono',Menlo,Consolas,monospace";

export const TYPE_LABEL: Record<AccountType, string> = {
  brand: "brand",
  stylist: "stylist",
  hair_seller: "hair seller",
};

function layout(preheader: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f5f5f5;">
<span style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</span>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:24px 12px;"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #0a0a0a;">
<tr><td style="padding:20px 28px;border-bottom:1px solid #0a0a0a;font-family:${FONT};font-size:17px;font-weight:700;letter-spacing:-0.5px;color:#0a0a0a;">qoyl<span style="font-family:${MONO};font-size:9px;font-weight:400;letter-spacing:1.5px;color:#aaaaaa;margin-left:6px;">business</span></td></tr>
<tr><td style="padding:32px 28px;font-family:${FONT};font-size:14px;line-height:1.7;color:#0a0a0a;">${inner}</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #e8e8e8;font-family:${MONO};font-size:10px;letter-spacing:.5px;color:#aaaaaa;">questions? reply to this email · hey@qoyl.live</td></tr>
</table></td></tr></table></body></html>`;
}

const h1 = (s: string) =>
  `<h1 style="margin:0 0 16px;font-family:${FONT};font-size:26px;font-weight:700;letter-spacing:-1px;line-height:1.15;color:#0a0a0a;">${esc(s)}</h1>`;
const p = (s: string) => `<p style="margin:0 0 16px;color:#444444;">${s}</p>`;
const sign = `<p style="margin:24px 0 0;color:#0a0a0a;">D<br/><span style="font-family:${MONO};font-size:11px;color:#666666;">founder, qoyl</span></p>`;

function button(href: string, label: string): string {
  return `<p style="margin:24px 0;"><a href="${esc(href)}" style="display:inline-block;background:#0a0a0a;color:#ffffff;text-decoration:none;padding:13px 28px;font-family:${FONT};font-size:13px;font-weight:600;letter-spacing:.5px;">${esc(label)}</a></p>`;
}

function fieldTable(fields: [string, string][]): string {
  const rows = fields
    .filter(([, v]) => v && v.trim())
    .map(
      ([k, v]) =>
        `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #e8e8e8;font-family:${MONO};font-size:10px;letter-spacing:.5px;color:#888888;vertical-align:top;white-space:nowrap;">${esc(k)}</td><td style="padding:8px 0;border-top:1px solid #e8e8e8;font-size:13px;color:#0a0a0a;vertical-align:top;">${esc(v).replace(/\n/g, "<br/>")}</td></tr>`
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:8px 0 8px;">${rows}</table>`;
}

function fieldText(fields: [string, string][]): string {
  return fields
    .filter(([, v]) => v && v.trim())
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

export type EmailContent = { subject: string; text: string; html: string };

// -- Alert to hey@qoyl.live on every submission ------------------------------
export function applicationAlertEmail(params: {
  type: AccountType;
  name: string;
  fields: [string, string][];
  note?: string;
}): EmailContent {
  const label = TYPE_LABEL[params.type];
  const subject = `new ${label} application — ${params.name}`;
  const noteText = params.note ? `\n\nNOTE: ${params.note}` : "";
  const text = `A new ${label} application was submitted.${noteText}\n\n${fieldText(params.fields)}\n\nReview it in /admin.`;
  const html = layout(
    subject,
    h1(`new ${label} application`) +
      (params.note ? p(`<strong>note:</strong> ${esc(params.note)}`) : "") +
      p(`<strong>${esc(params.name)}</strong> just applied. Reply to this email to reach them directly.`) +
      fieldTable(params.fields) +
      p("Review it in the admin dashboard.")
  );
  return { subject, text, html };
}

const WELCOME_COPY: Record<AccountType, { lead: string; next: string }> = {
  brand: {
    lead: "thanks for applying for a qoyl brand intelligence dashboard.",
    next: "once you're approved you'll get a login to your dashboard — ingredient performance scores, consumer demand signals from real qoyl users, and reformulation recommendations.",
  },
  stylist: {
    lead: "thanks for applying to list your services on qoyl.",
    next: "once you're approved you'll get a login to your stylist dashboard — see what your potential clients are matching with each month, and get discovered when a qoyl user finds a style that needs a pro.",
  },
  hair_seller: {
    lead: "thanks for applying to list your catalog on qoyl.",
    next: "once you're approved you'll get a login to upload your products and colorways, so they can be matched into style match shopping lists by color, texture and heat rating.",
  },
};

// -- Welcome to the applicant -------------------------------------------------
export function applicantWelcomeEmail(params: {
  type: AccountType;
  contactName: string;
  fields: [string, string][];
}): EmailContent {
  const copy = WELCOME_COPY[params.type];
  const subject = "we got your qoyl application";
  const text = `Hi ${params.contactName},

${copy.lead}

We review every application personally and will be in touch within 48 hours.

What happens next: ${copy.next}

What you submitted:
${fieldText(params.fields)}

Questions? Reply to this email.

D
Founder, Qoyl`;
  const html = layout(
    "we review every application personally — you'll hear from us within 48 hours.",
    h1("we got your application.") +
      p(`Hi ${esc(params.contactName)}, ${esc(copy.lead)}`) +
      p("We review every application personally and will be in touch <strong>within 48 hours</strong>.") +
      p(`<strong>What happens next:</strong> ${esc(copy.next)}`) +
      `<p style="margin:24px 0 4px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">WHAT YOU SUBMITTED</p>` +
      fieldTable(params.fields) +
      sign
  );
  return { subject, text, html };
}

// -- Approval (login + Stripe payment link) ----------------------------------
const APPROVAL_COPY: Record<AccountType, { subject: string; lead: string; bullets: string[] }> = {
  brand: {
    subject: "Your Qoyl Brand Dashboard is approved",
    lead: "your brand intelligence dashboard is ready.",
    bullets: [
      "Ingredient performance scores for your products",
      "Consumer demand signals from real Qoyl users",
      "Reformulation recommendations",
    ],
  },
  stylist: {
    subject: "Your Qoyl Stylist Dashboard is approved",
    lead: "your stylist dashboard is ready.",
    bullets: [
      "What your potential clients are matching with each month",
      "Booking inquiries from consumers who chose you after a Style Match",
    ],
  },
  hair_seller: {
    subject: "Welcome to Qoyl — your hair seller account is active",
    lead: "your hair seller account is active.",
    bullets: [
      "Upload your catalog (styles, colors, pack counts) so your products can be matched into Style Match shopping lists",
      "Track impressions, click-throughs and color-match rates",
    ],
  },
};

// The score preview the brand sees before paying - the first time they get
// real value from qoyl. Built from qoyl-beta's score report (lib/scoreReportClient.ts).
export type ScorePreviewInput = {
  productName: string;
  // Five rows: the top three and bottom two profiles, highest first.
  rows: { label: string; score: number }[];
  keyFinding: string;
};

function scoreColor(score: number): string {
  if (score >= 70) return "#2D7A3D";
  if (score >= 40) return "#C4831A";
  return "#B03030";
}

function scoreMark(score: number): string {
  if (score >= 70) return "✓";
  if (score >= 40) return "⚠";
  return "✗";
}

function scorePreviewHtml(sp: ScorePreviewInput): string {
  const rows = sp.rows
    .map(
      (r) =>
        `<tr><td style="padding:8px 12px 8px 0;border-top:1px solid #e8e8e8;font-family:${MONO};font-size:11px;color:#444444;">${esc(r.label)}</td><td style="padding:8px 0;border-top:1px solid #e8e8e8;text-align:right;font-family:${MONO};font-size:14px;font-weight:700;color:${scoreColor(r.score)};">${r.score} ${scoreMark(r.score)}</td></tr>`
    )
    .join("");
  return `<p style="margin:24px 0 8px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">SCORE PREVIEW · ${esc(sp.productName.toUpperCase())}</p>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0;"><tr><td style="padding:0 12px 6px 0;font-family:${MONO};font-size:9px;color:#888888;">profile</td><td style="padding:0 0 6px;font-family:${MONO};font-size:9px;color:#888888;text-align:right;">score</td></tr>${rows}</table>
<p style="margin:16px 0;border-left:2px solid #0a0a0a;padding-left:14px;color:#0a0a0a;">${esc(sp.keyFinding)}</p>`;
}

function scorePreviewText(sp: ScorePreviewInput): string {
  const rows = sp.rows.map((r) => `${r.label}: ${r.score} ${scoreMark(r.score)}`).join("\n");
  return `SCORE PREVIEW · ${sp.productName}\n${rows}\n\n${sp.keyFinding}\n`;
}

export function approvalEmail(params: {
  type: AccountType;
  contactName: string;
  email: string;
  tempPassword: string;
  siteUrl: string;
  // Empty = Payment Links aren't configured yet, so the payment block is omitted.
  payment: PaymentOption[];
  // Brand approvals with a score report: adds the preview and the
  // "after payment" list, and makes the subject name the product.
  scorePreview?: ScorePreviewInput | null;
}): EmailContent {
  const copy = APPROVAL_COPY[params.type];
  const loginUrl = `${params.siteUrl}/login`;
  const sp = params.scorePreview ?? null;
  const scoreText = sp ? `\n${scorePreviewText(sp)}\n` : "";
  const scoreHtml = sp ? scorePreviewHtml(sp) : "";
  const afterPaymentText = sp
    ? `\nAfter payment you'll have immediate access to:\n→ full score breakdown across all hair profiles\n→ segment analysis - which customers your formula was built for\n→ ingredient flags with reformulation recommendations\n→ geographic demand signals\n→ style match placement tracking\n`
    : "";
  const afterPaymentHtml = sp
    ? `<p style="margin:16px 0 4px;color:#0a0a0a;">after payment you'll have immediate access to:</p><ul style="margin:0 0 16px;padding-left:18px;color:#444444;">${[
        "full score breakdown across all hair profiles",
        "segment analysis - which customers your formula was built for",
        "ingredient flags with reformulation recommendations",
        "geographic demand signals",
        "style match placement tracking",
      ]
        .map((b) => `<li style="margin:4px 0;">${esc(b)}</li>`)
        .join("")}</ul>`
    : "";

  const paymentText = params.payment.length
    ? `\nTo activate your plan, complete payment:\n${params.payment
        .map((o) => `→ ${o.label} (${o.price}): ${o.url}`)
        .join("\n")}\n\nFlat monthly rate, cancel anytime. No commission, ever.\n`
    : "";

  const text = `Hi ${params.contactName},

Welcome to Qoyl — ${copy.lead}
${scoreText}
Login at: ${loginUrl}
Email: ${params.email}
Temporary password: ${params.tempPassword}

Please change your password after your first login by clicking "Forgot password" on the login page.
${paymentText}${afterPaymentText}
Your account gives you access to:
${copy.bullets.map((b) => `→ ${b}`).join("\n")}

Questions? Reply to this email — we're here.

D
Founder, Qoyl`;

  const paymentHtml = params.payment.length
    ? `<div style="margin:24px 0;border:1px solid #0a0a0a;padding:20px 24px;">
<p style="margin:0 0 4px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">ACTIVATE YOUR PLAN</p>
<p style="margin:0 0 4px;color:#444444;">Complete payment to keep your listing live. Flat monthly rate, cancel anytime — no commission, ever.</p>
${params.payment
  .map(
    (o) =>
      `${button(o.url, `${o.label} — ${o.price} →`).replace('margin:24px 0;', 'margin:12px 0 0;')}`
  )
  .join("")}
</div>`
    : "";

  const html = layout(
    `${copy.lead} Log in with the temporary password inside.`,
    h1("you're approved.") +
      p(`Hi ${esc(params.contactName)}, welcome to Qoyl — ${esc(copy.lead)}`) +
      scoreHtml +
      fieldTable([
        ["LOGIN", loginUrl],
        ["EMAIL", params.email],
        ["TEMP PASSWORD", params.tempPassword],
      ]) +
      button(loginUrl, "log in →") +
      p('Please change your password after your first login by clicking "Forgot password" on the login page.') +
      paymentHtml +
      afterPaymentHtml +
      `<p style="margin:24px 0 4px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">YOUR ACCOUNT GIVES YOU</p>` +
      `<ul style="margin:0 0 16px;padding-left:18px;color:#444444;">${copy.bullets.map((b) => `<li style="margin:4px 0;">${esc(b)}</li>`).join("")}</ul>` +
      sign
  );

  const subject = sp ? `your ${sp.productName} score report — qoyl brand access approved` : copy.subject;
  return { subject, text, html };
}

// ---------------------------------------------------------------------------
// Self-serve brand flow (no approval step). See lib/brandSignup.ts.
// ---------------------------------------------------------------------------


// Sent right after a brand applies. Carries the Payment Link for their plan.
export function brandWelcomeWithPaymentEmail(params: {
  firstName: string;
  brandName: string;
  productToScore: string | null;
  paymentUrl: string;
}): EmailContent {
  const subject = "welcome to qoyl — complete your brand setup";
  const productLabel = params.productToScore?.trim() || "your first product";
  const cta = "complete setup — $50/month →";

  const text = `hey ${params.firstName},

your qoyl brand account is ready. ${params.brandName} is one step away from your full ingredient intelligence dashboard.

WHAT HAPPENS NEXT

01  complete your payment
    $50/month · cancel any time

02  we score ${productLabel}
    you'll see your product scored across 6 hair profiles immediately after setup

03  your dashboard goes live
    scores, segments, ingredient flags, and reformulation signals — all on day one

${cta}
${params.paymentUrl}

after payment you'll receive a login link to access your dashboard.

WHAT YOU'LL SEE ON DAY ONE
· product scores across 6 representative hair profiles
· segment breakdown — which curl types and porosity levels your formula wins with
· ingredient flags with reformulation recommendations
· geographic demand — which cities are searching your products
· style match placement tracking

questions? reply here — every message read personally.
— d · founder, qoyl`;

  const step = (n: string, title: string, sub: string) =>
    `<tr>
<td style="padding:14px 16px 14px 0;border-top:1px solid #e8e8e8;vertical-align:top;font-family:${MONO};font-size:18px;font-weight:700;color:#0a0a0a;width:48px;">${n}</td>
<td style="padding:14px 0;border-top:1px solid #e8e8e8;vertical-align:top;">
<div style="font-family:${FONT};font-size:14px;font-weight:500;color:#0a0a0a;">${title}</div>
<div style="font-family:${FONT};font-size:12px;font-weight:300;color:#888888;margin-top:4px;line-height:1.6;">${sub}</div>
</td></tr>`;

  const features = [
    "product scores across 6 representative hair profiles",
    "segment breakdown — which curl types and porosity levels your formula wins with",
    "ingredient flags with reformulation recommendations",
    "geographic demand — which cities are searching your products",
    "style match placement tracking",
  ];

  const html = layout(
    "one step away — complete your payment to open your dashboard.",
    h1("welcome to qoyl.") +
      p(`hey ${esc(params.firstName)},`) +
      p(`your qoyl brand account is ready. <strong>${esc(params.brandName)}</strong> is one step away from your full ingredient intelligence dashboard.`) +
      `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0 0;">
${step("01", "complete your payment", "$50/month · cancel any time")}
${step("02", `we score ${esc(productLabel)}`, "you'll see your product scored across 6 hair profiles immediately after setup")}
${step("03", "your dashboard goes live", "scores, segments, ingredient flags, and reformulation signals — all on day one")}
<tr><td colspan="2" style="border-top:1px solid #e8e8e8;"></td></tr>
</table>` +
      `<a href="${esc(params.paymentUrl)}" style="display:block;margin:24px 0 8px;background:#0a0a0a;color:#ffffff;text-align:center;text-decoration:none;padding:16px;font-family:${FONT};font-size:14px;font-weight:600;letter-spacing:.3px;">${esc(cta)}</a>` +
      `<p style="margin:0 0 28px;text-align:center;font-family:${FONT};font-size:11px;font-weight:300;color:#888888;">after payment you'll receive a login link to access your dashboard.</p>` +
      `<p style="margin:0 0 8px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">WHAT YOU'LL SEE ON DAY ONE</p>` +
      `<div style="font-family:${FONT};font-size:12px;font-weight:300;color:#666666;line-height:1.8;">${features.map((f) => `· ${esc(f)}`).join("<br/>")}</div>` +
      `<p style="margin:28px 0 0;color:#444444;">questions? reply here — every message read personally.</p>` +
      `<p style="margin:8px 0 0;color:#0a0a0a;">— d · founder, qoyl</p>`
  );

  return { subject, text, html };
}

// Sent by the Stripe webhook once payment clears. Carries a one-time sign-in link.
export function brandActivationEmail(params: {
  firstName: string;
  email: string;
  productToScore: string | null;
  magicLinkUrl: string;
}): EmailContent {
  const subject = "your qoyl dashboard is live — sign in now";
  const scoreLine = params.productToScore?.trim()
    ? `your ${params.productToScore.trim()} score report is waiting inside.`
    : "your score report is waiting inside.";
  const loginUrl = "business.qoyl.live/login";
  const text = `hey ${params.firstName},

payment confirmed. your qoyl brand dashboard is live.

sign in to your dashboard: ${params.magicLinkUrl}

this link works once and expires shortly. if it has expired, sign in at ${loginUrl} with your email ${params.email} and we'll send a fresh one.

${scoreLine}

questions? reply here — every message read personally.
— d · founder, qoyl`;

  const html = layout(
    "payment confirmed — your dashboard is live.",
    h1("your dashboard is live.") +
      p(`hey ${esc(params.firstName)},`) +
      p("payment confirmed. your qoyl brand dashboard is live.") +
      button(params.magicLinkUrl, "sign in to your dashboard →") +
      `<p style="margin:0 0 12px;font-family:${FONT};font-size:11px;font-weight:300;color:#888888;line-height:1.6;">this link works once and expires shortly. if it has expired, sign in at ${esc(loginUrl)} with your email ${esc(params.email)} and we'll send a fresh one.</p>` +
      `<p style="margin:0 0 16px;font-family:${FONT};font-size:13px;font-weight:300;color:#666666;">${esc(scoreLine)}</p>` +
      sign
  );

  return { subject, text, html };
}

// Sign-in link requested from /login.
export function signInLinkEmail(params: { firstName: string; magicLinkUrl: string }): EmailContent {
  const subject = "your qoyl sign-in link";
  const text = `hey ${params.firstName},

here's your sign-in link:
${params.magicLinkUrl}

this link works once and expires shortly. if you didn't ask for it, you can ignore this email.

— d · founder, qoyl`;
  const html = layout(
    "your sign-in link — works once.",
    h1("sign in to qoyl.") +
      p(`hey ${esc(params.firstName)},`) +
      p("here's your sign-in link.") +
      button(params.magicLinkUrl, "sign in →") +
      `<p style="margin:0 0 12px;font-family:${FONT};font-size:11px;font-weight:300;color:#888888;line-height:1.6;">this link works once and expires shortly. if you didn't ask for it, you can ignore this email.</p>` +
      sign
  );
  return { subject, text, html };
}
