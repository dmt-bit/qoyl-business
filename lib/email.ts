// Every outbound email (application alerts, applicant welcome, approval)
// goes through here. Sender defaults to hey@qoyl.live -- the domain must be
// verified in Resend; set RESEND_FROM to override (e.g. back to
// onboarding@resend.dev while testing without a verified domain).
export const NOTIFY_EMAIL = "hey@qoyl.live";
const DEFAULT_FROM = "qoyl <hey@qoyl.live>";

// Best-effort Resend send. Never throws -- callers decide what a failed send
// means (application routes treat it as non-fatal, since the application is
// already saved). `html` is sent alongside `text` so clients that don't
// render HTML still get a readable message.
export async function sendEmail(params: {
  to: string;
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}): Promise<{ sent: boolean; error: string | null }> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return { sent: false, error: "RESEND_API_KEY is not set" };

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.RESEND_FROM || DEFAULT_FROM,
        to: params.to,
        subject: params.subject,
        text: params.text,
        ...(params.html ? { html: params.html } : {}),
        ...(params.replyTo ? { reply_to: params.replyTo } : {}),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      return { sent: false, error: `Resend ${res.status}: ${body.slice(0, 300)}` };
    }
    return { sent: true, error: null };
  } catch (err) {
    return { sent: false, error: err instanceof Error ? err.message : String(err) };
  }
}
