// Server-only Resend sender. Lazily initializes the SDK so missing API keys
// surface as a clear runtime error rather than a module-load crash.
import { Resend } from "resend";

const FROM_ADDRESS = "FishTrippers <hello@fishtrippers.com>";

let _client: Resend | null = null;
function client(): Resend {
  if (_client) return _client;
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY is not configured");
  _client = new Resend(key);
  return _client;
}

function textToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return `<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;font-size:14px;line-height:1.55;color:#111;white-space:pre-wrap">${escaped}</div>`;
}

export async function sendEmail(args: {
  to: string;
  subject: string;
  body: string;
  from?: string;
}): Promise<{ id: string | null }> {
  const { data, error } = await client().emails.send({
    from: args.from ?? FROM_ADDRESS,
    to: [args.to],
    subject: args.subject,
    text: args.body,
    html: textToHtml(args.body),
  });

  if (error) {
    throw new Error(`Resend send failed: ${error.message ?? JSON.stringify(error)}`);
  }
  return { id: data?.id ?? null };
}
