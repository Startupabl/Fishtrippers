// Server-only render helper for header-bell alert messages. Looks up an
// alert template row by `purpose` and interpolates {{var}} tokens, falling
// back to bundled defaults if the row is missing.
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ALERT_TEMPLATE_DEFAULTS,
  type AlertTemplatePurpose,
} from "./alert-templates.defaults";
import { renderTemplateString } from "./email-templates.defaults";

export async function renderAlertTemplate(
  purpose: AlertTemplatePurpose,
  vars: Record<string, string | number | undefined | null>,
): Promise<string> {
  const { data } = await supabaseAdmin
    .from("alert_templates")
    .select("message")
    .eq("purpose", purpose)
    .maybeSingle();

  const def = ALERT_TEMPLATE_DEFAULTS[purpose];
  const message = data?.message ?? def?.message ?? "";
  return renderTemplateString(message, vars);
}
