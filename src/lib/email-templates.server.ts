// Server-only render helper for webhook code paths. Looks up a template by
// `purpose` and interpolates {{var}} tokens. Falls back to bundled defaults
// if the row is missing so transactional emails never fail to render.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  type EmailTemplatePurpose,
  renderTemplateString,
} from "./email-templates.defaults";

export async function renderEmailTemplate(
  purpose: EmailTemplatePurpose,
  vars: Record<string, string | number | undefined | null>,
): Promise<{ subject: string; body: string }> {
  const { data } = await supabaseAdmin
    .from("email_templates")
    .select("subject, body")
    .eq("purpose", purpose)
    .maybeSingle();

  const def = EMAIL_TEMPLATE_DEFAULTS[purpose];
  const subject = data?.subject ?? def?.subject ?? "";
  const body = data?.body ?? def?.body ?? "";
  return {
    subject: renderTemplateString(subject, vars),
    body: renderTemplateString(body, vars),
  };
}
