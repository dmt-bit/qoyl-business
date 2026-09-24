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

const FONT = "'Helvetica Neue',Helvetica,Arial,sans-serif";
const MONO = "'SFMono-Regular',Menlo,Consolas,monospace";

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
}): EmailContent {
  const label = TYPE_LABEL[params.type];
  const subject = `new ${label} application — ${params.name}`;
  const text = `A new ${label} application was submitted.\n\n${fieldText(params.fields)}\n\nReview it in /admin.`;
  const html = layout(
    subject,
    h1(`new ${label} application`) +
      p(`<strong>${esc(params.name)}</strong> just applied. Reply to this email to reach them directly.`) +
      fieldTable(params.fields) +
      p("Review and approve it in the admin dashboard.")
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

export function approvalEmail(params: {
  type: AccountType;
  contactName: string;
  email: string;
  tempPassword: string;
  siteUrl: string;
  // One option when the plan is known; several (brand w/o a recorded tier)
  // lets the applicant pick theirs. Empty = Payment Links aren't configured
  // yet, so the payment block is omitted.
  payment: PaymentOption[];
}): EmailContent {
  const copy = APPROVAL_COPY[params.type];
  const loginUrl = `${params.siteUrl}/login`;

  const paymentText = params.payment.length
    ? `\nTo activate your plan, complete payment:\n${params.payment
        .map((o) => `→ ${o.label} (${o.price}): ${o.url}`)
        .join("\n")}\n\nFlat monthly rate, cancel anytime. No commission, ever.\n`
    : "";

  const text = `Hi ${params.contactName},

Welcome to Qoyl — ${copy.lead}

Login at: ${loginUrl}
Email: ${params.email}
Temporary password: ${params.tempPassword}

Please change your password after your first login by clicking "Forgot password" on the login page.
${paymentText}
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
      fieldTable([
        ["LOGIN", loginUrl],
        ["EMAIL", params.email],
        ["TEMP PASSWORD", params.tempPassword],
      ]) +
      button(loginUrl, "log in →") +
      p('Please change your password after your first login by clicking "Forgot password" on the login page.') +
      paymentHtml +
      `<p style="margin:24px 0 4px;font-family:${MONO};font-size:10px;letter-spacing:1px;color:#888888;">YOUR ACCOUNT GIVES YOU</p>` +
      `<ul style="margin:0 0 16px;padding-left:18px;color:#444444;">${copy.bullets.map((b) => `<li style="margin:4px 0;">${esc(b)}</li>`).join("")}</ul>` +
      sign
  );

  return { subject: copy.subject, text, html };
}
