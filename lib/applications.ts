import { NextResponse } from "next/server";
import { getSupabaseAdmin } from "./supabaseAdmin";
import { NOTIFY_EMAIL, sendEmail } from "./email";
import { applicationAlertEmail, applicantWelcomeEmail } from "./emailTemplates";
import type { AccountType } from "./accountTypes";

// Shared by all three application routes: validate -> insert (service role,
// status 'pending') -> alert hey@qoyl.live + HTML welcome to the applicant.
// Admin approval later promotes the row to an account, same two-step flow as
// before -- only the front door changed (forms used to insert straight from
// the browser and send nothing).

export type ParsedApplication = {
  row: Record<string, unknown>;
  name: string; // shown in the alert subject
  contactName: string;
  email: string;
  fields: [string, string][]; // label/value pairs echoed in both emails
};

type ParseResult = { ok: true; value: ParsedApplication } | { ok: false; message: string };

// Read an optional/required trimmed string off the JSON body, capped so a
// public endpoint can't be used to stuff arbitrarily large rows.
export function str(body: Record<string, unknown>, key: string, max = 500): string {
  const v = body[key];
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

export function validEmail(v: string): boolean {
  return /^\S+@\S+\.\S+$/.test(v) && v.length <= 254;
}

// Postgres "undefined column" / PostgREST "column not in schema cache".
function isMissingColumn(error: { code?: string } | null): boolean {
  return error?.code === "42703" || error?.code === "PGRST204";
}

export async function handleApplication(
  request: Request,
  opts: {
    type: AccountType;
    table: string;
    parse: (body: Record<string, unknown>) => ParseResult;
    // Columns added by a newer migration. If the migration hasn't been run
    // yet the insert is retried without them, so applications keep working.
    optionalColumns?: string[];
  }
) {
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid JSON body." }, { status: 400 });
  }

  const parsed = opts.parse(body);
  if (!parsed.ok) {
    return NextResponse.json({ success: false, message: parsed.message }, { status: 400 });
  }
  const { row, name, contactName, email, fields } = parsed.value;
  const insertRow: Record<string, unknown> = { ...row, status: "pending" };

  const db = getSupabaseAdmin();
  let { error } = await db.from(opts.table).insert(insertRow);
  if (error && isMissingColumn(error) && opts.optionalColumns?.length) {
    const stripped = { ...insertRow };
    for (const col of opts.optionalColumns) delete stripped[col];
    ({ error } = await db.from(opts.table).insert(stripped));
  }
  if (error) {
    console.error(`[apply/${opts.type}] insert failed:`, error);
    return NextResponse.json(
      { success: false, message: "Something went wrong submitting your application. Please try again." },
      { status: 500 }
    );
  }

  const alert = applicationAlertEmail({ type: opts.type, name, fields: [["EMAIL", email], ...fields] });
  const welcome = applicantWelcomeEmail({ type: opts.type, contactName, fields });
  const [internal, applicant] = await Promise.all([
    sendEmail({ to: NOTIFY_EMAIL, replyTo: email, ...alert }),
    sendEmail({ to: email, ...welcome }),
  ]);
  if (!internal.sent) console.error(`[apply/${opts.type}] alert email failed:`, internal.error);
  if (!applicant.sent) console.error(`[apply/${opts.type}] welcome email failed:`, applicant.error);

  return NextResponse.json({ success: true, message: "Application received" });
}
