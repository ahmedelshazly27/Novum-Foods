// POST /functions/v1/contact
// Stores a contact-form lead in `contact_submissions` and emails the sender a
// confirmation through Resend. Optionally notifies the team (NOTIFY_EMAIL).
//
// Secrets (set with `supabase secrets set`):
//   RESEND_API_KEY   required  Resend API key
//   EMAIL_FROM       optional  default "Novum <hello@novum-foods.com>"
//   EMAIL_REPLY_TO   optional  default "hello@novum-foods.com"
//   NOTIFY_EMAIL     optional  comma-separated team inboxes to alert on new leads
//   ALLOWED_ORIGINS  optional  comma-separated; defaults to novum-foods.com (+www)
// SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are injected by Supabase.

import { createClient } from "npm:@supabase/supabase-js@2";
import {
  confirmationHtml,
  confirmationSubject,
  confirmationText,
  firstName,
  notificationText,
} from "./email.ts";

const ROLES = [
  "Ingredient originator",
  "Manufacturer",
  "Restaurant or hospitality group",
  "Distributor",
  "Other",
];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const MAX_PER_EMAIL_PER_HOUR = 3;

const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") ??
  "https://novum-foods.com,https://www.novum-foods.com")
  .split(",").map((o) => o.trim()).filter(Boolean);

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  { auth: { persistSession: false } },
);

function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  if (allowedOrigins.includes(origin)) return true;
  // Vercel preview deployments of the website project.
  return /^https:\/\/novum-website-[a-z0-9-]+\.vercel\.app$/.test(origin);
}

function corsHeaders(origin: string | null): HeadersInit {
  return {
    "Access-Control-Allow-Origin": isAllowedOrigin(origin) ? origin! : allowedOrigins[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type",
    "Vary": "Origin",
  };
}

function json(body: unknown, status: number, origin: string | null): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(origin), "Content-Type": "application/json" },
  });
}

function field(value: unknown, max: number): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim().slice(0, max);
  return trimmed || null;
}

async function sendEmail(payload: Record<string, unknown>): Promise<void> {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) throw new Error(`Resend ${res.status}: ${await res.text()}`);
}

Deno.serve(async (req) => {
  const origin = req.headers.get("origin");

  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405, origin);
  if (!isAllowedOrigin(origin)) return json({ error: "Forbidden" }, 403, origin);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON" }, 400, origin);
  }

  // Honeypot: real visitors never see or fill this field. Pretend success.
  if (field(body.website, 200)) return json({ ok: true }, 200, origin);

  const role = field(body.role, 100);
  const lead = {
    role: role && ROLES.includes(role) ? role : role ? "Other" : null,
    full_name: field(body.name, 200),
    company: field(body.company, 200),
    email: field(body.email, 320)?.toLowerCase() ?? null,
    message: field(body.message, 5000),
    source_page: field(body.page, 500),
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
  };

  if (!lead.full_name) return json({ error: "Please enter your name." }, 400, origin);
  if (!lead.email || !EMAIL_RE.test(lead.email)) {
    return json({ error: "Please enter a valid email address." }, 400, origin);
  }

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { count } = await supabase
    .from("contact_submissions")
    .select("id", { count: "exact", head: true })
    .eq("email", lead.email)
    .gte("created_at", since);
  if ((count ?? 0) >= MAX_PER_EMAIL_PER_HOUR) {
    return json({ error: "We've already received your message. We'll be in touch soon." }, 429, origin);
  }

  const { data: row, error: insertError } = await supabase
    .from("contact_submissions")
    .insert(lead)
    .select("id")
    .single();
  if (insertError) {
    console.error("insert failed", insertError);
    return json({ error: "Something went wrong. Please email hello@novum-foods.com." }, 500, origin);
  }

  const from = Deno.env.get("EMAIL_FROM") ?? "Novum <hello@novum-foods.com>";
  const replyTo = Deno.env.get("EMAIL_REPLY_TO") ?? "hello@novum-foods.com";
  const name = firstName(lead.full_name);

  // The lead is saved; email failures are recorded on the row, not surfaced
  // to the visitor.
  let confirmationError: string | null = null;
  try {
    await sendEmail({
      from,
      to: [lead.email],
      reply_to: replyTo,
      subject: confirmationSubject,
      html: confirmationHtml(name),
      text: confirmationText(name),
    });
  } catch (err) {
    confirmationError = String(err).slice(0, 1000);
    console.error("confirmation email failed", err);
  }
  await supabase
    .from("contact_submissions")
    .update({ confirmation_sent: !confirmationError, confirmation_error: confirmationError })
    .eq("id", row.id);

  const notify = Deno.env.get("NOTIFY_EMAIL");
  if (notify) {
    try {
      await sendEmail({
        from,
        to: notify.split(",").map((e) => e.trim()).filter(Boolean),
        reply_to: lead.email,
        subject: `New enquiry: ${lead.full_name}${lead.company ? ` (${lead.company})` : ""}`,
        text: notificationText({ ...lead, full_name: lead.full_name, email: lead.email }),
      });
    } catch (err) {
      console.error("team notification failed", err);
    }
  }

  return json({ ok: true }, 200, origin);
});
