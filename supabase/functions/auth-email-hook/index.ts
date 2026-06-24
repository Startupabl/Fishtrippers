// Supabase Auth "Send Email Hook" — receives every outbound auth email
// (signup confirm, password reset, magic link, email change, reauth, invite)
// and sends it via Resend from hello@fishtrippers.com using the admin-editable
// templates stored in public.email_templates.
//
// Configured with verify_jwt = false; Supabase signs the request body using
// the standard-webhooks scheme (header `webhook-signature: v1,<base64hmac>`),
// verified against SEND_EMAIL_HOOK_SECRET.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Resend } from "https://esm.sh/resend@4.0.0";

const FROM_ADDRESS = "FishTrippers <hello@fishtrippers.com>";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")!;
const HOOK_SECRET = Deno.env.get("SEND_EMAIL_HOOK_SECRET") ?? "";

const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const resend = new Resend(RESEND_API_KEY);

// ------ standard-webhooks signature verification ------
function base64Decode(b64: string): Uint8Array {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function base64Encode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

async function verifySignature(req: Request, rawBody: string): Promise<boolean> {
  if (!HOOK_SECRET) return false;
  const id = req.headers.get("webhook-id");
  const ts = req.headers.get("webhook-timestamp");
  const sigHeader = req.headers.get("webhook-signature");
  if (!id || !ts || !sigHeader) return false;

  // Secret format: "v1,whsec_<base64>" or "whsec_<base64>"
  let secretPart = HOOK_SECRET;
  if (secretPart.startsWith("v1,")) secretPart = secretPart.slice(3);
  if (secretPart.startsWith("whsec_")) secretPart = secretPart.slice(6);
  const keyBytes = base64Decode(secretPart);

  const key = await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signed = `${id}.${ts}.${rawBody}`;
  const mac = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(signed));
  const expected = base64Encode(new Uint8Array(mac));

  // Header may contain multiple space-separated "v1,<sig>" entries.
  for (const part of sigHeader.split(" ")) {
    const [version, sig] = part.split(",");
    if (version === "v1" && sig && timingSafeEqual(sig, expected)) return true;
  }
  return false;
}

// ------ template lookup with seeded defaults fallback ------
const DEFAULT_TEMPLATES: Record<string, { subject: string; body: string }> = {
  email_verification: {
    subject: "Verify your FishTrippers email address",
    body: `Hi {{first_name}},

Please confirm your email address to activate your FishTrippers account:

{{verification_url}}

This link will expire in 24 hours.

— The FishTrippers Team`,
  },
  password_reset: {
    subject: "Reset your FishTrippers password",
    body: `Hi {{first_name}},

We received a request to reset your FishTrippers password. Click the link below to choose a new one:

{{reset_url}}

If you didn't request this, you can safely ignore this email.

— The FishTrippers Team`,
  },
  magic_link: {
    subject: "Your FishTrippers sign-in link",
    body: `Hi {{first_name}},

Click the link below to sign in to FishTrippers:

{{magic_link}}

This link expires in 15 minutes.

— The FishTrippers Team`,
  },
};

function renderTemplateString(s: string, vars: Record<string, string>): string {
  return s.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_, k) =>
    vars[k] === undefined || vars[k] === null ? `{{${k}}}` : String(vars[k]),
  );
}

async function loadTemplate(purpose: string): Promise<{ subject: string; body: string }> {
  const { data } = await admin
    .from("email_templates")
    .select("subject, body")
    .eq("purpose", purpose)
    .maybeSingle();
  const def = DEFAULT_TEMPLATES[purpose] ?? { subject: "", body: "" };
  return { subject: data?.subject ?? def.subject, body: data?.body ?? def.body };
}

function textToHtml(text: string): string {
  const escaped = text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;color:#111;white-space:pre-wrap">${escaped}</div>`;
}

interface AuthHookPayload {
  user: {
    email: string;
    user_metadata?: Record<string, unknown>;
    new_email?: string;
  };
  email_data: {
    token: string;
    token_hash: string;
    redirect_to: string;
    email_action_type:
      | "signup"
      | "invite"
      | "magiclink"
      | "recovery"
      | "email_change"
      | "email_change_current"
      | "reauthentication";
    site_url: string;
    token_new?: string;
    token_hash_new?: string;
  };
}

function buildVerifyUrl(p: AuthHookPayload, verifyType: string, hash?: string): string {
  const base = p.email_data.site_url.replace(/\/+$/, "");
  const params = new URLSearchParams({
    token_hash: hash ?? p.email_data.token_hash,
    type: verifyType,
  });
  if (p.email_data.redirect_to) params.set("redirect_to", p.email_data.redirect_to);
  return `${base}/auth/verify?${params.toString()}`;
}

async function buildEmail(payload: AuthHookPayload): Promise<{ to: string; subject: string; body: string } | null> {
  const action = payload.email_data.email_action_type;
  const meta = payload.user.user_metadata ?? {};
  const firstName = (meta.first_name as string) || (meta.full_name as string)?.split(" ")[0] || "there";

  switch (action) {
    case "signup":
    case "invite": {
      const url = buildVerifyUrl(payload, action === "invite" ? "invite" : "signup");
      const tpl = await loadTemplate("email_verification");
      const subject = action === "invite"
        ? "You've been invited to FishTrippers"
        : tpl.subject;
      return {
        to: payload.user.email,
        subject: renderTemplateString(subject, { first_name: firstName, verification_url: url }),
        body: renderTemplateString(tpl.body, { first_name: firstName, verification_url: url }),
      };
    }
    case "recovery": {
      const url = buildVerifyUrl(payload, "recovery");
      const tpl = await loadTemplate("password_reset");
      return {
        to: payload.user.email,
        subject: renderTemplateString(tpl.subject, { first_name: firstName, reset_url: url }),
        body: renderTemplateString(tpl.body, { first_name: firstName, reset_url: url }),
      };
    }
    case "magiclink": {
      const url = buildVerifyUrl(payload, "magiclink");
      const tpl = await loadTemplate("magic_link");
      return {
        to: payload.user.email,
        subject: renderTemplateString(tpl.subject, { first_name: firstName, magic_link: url }),
        body: renderTemplateString(tpl.body, { first_name: firstName, magic_link: url }),
      };
    }
    case "email_change":
    case "email_change_current": {
      // Supabase sends two requests — one to the old address, one to the new.
      const isNew = action === "email_change";
      const recipient = isNew && payload.user.new_email ? payload.user.new_email : payload.user.email;
      const hash = isNew && payload.email_data.token_hash_new
        ? payload.email_data.token_hash_new
        : payload.email_data.token_hash;
      const url = buildVerifyUrl(payload, "email_change", hash);
      const tpl = await loadTemplate("email_verification");
      const subject = isNew
        ? "Confirm your new FishTrippers email address"
        : "An email change was requested on your FishTrippers account";
      return {
        to: recipient,
        subject,
        body: renderTemplateString(tpl.body, { first_name: firstName, verification_url: url }),
      };
    }
    case "reauthentication": {
      return {
        to: payload.user.email,
        subject: "Your FishTrippers verification code",
        body: `Hi ${firstName},\n\nYour verification code is: ${payload.email_data.token}\n\nThis code expires shortly.\n\n— The FishTrippers Team`,
      };
    }
    default:
      return null;
  }
}

Deno.serve(async (req) => {
  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const rawBody = await req.text();

  if (HOOK_SECRET) {
    const ok = await verifySignature(req, rawBody);
    if (!ok) {
      console.error("[auth-email-hook] signature verification failed");
      return new Response(JSON.stringify({ error: "invalid signature" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }
  } else {
    console.warn("[auth-email-hook] SEND_EMAIL_HOOK_SECRET not set — accepting without verification");
  }

  let payload: AuthHookPayload;
  try {
    payload = JSON.parse(rawBody) as AuthHookPayload;
  } catch (e) {
    console.error("[auth-email-hook] bad JSON", e);
    return new Response(JSON.stringify({ error: "bad payload" }), { status: 400 });
  }

  try {
    const email = await buildEmail(payload);
    if (!email) {
      console.warn("[auth-email-hook] unhandled action", payload.email_data?.email_action_type);
      return new Response(JSON.stringify({ ok: true, skipped: true }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    const { error } = await resend.emails.send({
      from: FROM_ADDRESS,
      to: [email.to],
      subject: email.subject,
      text: email.body,
      html: textToHtml(email.body),
    });
    if (error) {
      console.error("[auth-email-hook] Resend error", error);
      return new Response(JSON.stringify({ error: error.message ?? "send failed" }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[auth-email-hook] handler error", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "unknown" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
});
