// Admin server functions for the alert_templates manager. Thin file: only
// createServerFn declarations + their imports.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  ALERT_TEMPLATE_DEFAULTS,
  type AlertTemplatePurpose,
} from "./alert-templates.defaults";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export interface AlertTemplateRow {
  id: string;
  purpose: string;
  display_name: string;
  description: string | null;
  message: string;
  variables: string[];
  is_system: boolean;
  updated_at: string;
}

export const listAlertTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("alert_templates")
      .select("id, purpose, display_name, description, message, variables, is_system, updated_at")
      .order("display_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as AlertTemplateRow[];
  });

export const updateAlertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        message: z.string().min(1).max(500),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("alert_templates")
      .update({ message: data.message })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetAlertTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), purpose: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const def = ALERT_TEMPLATE_DEFAULTS[data.purpose as AlertTemplatePurpose];
    if (!def) throw new Error("No default for purpose: " + data.purpose);
    const { error } = await supabaseAdmin
      .from("alert_templates")
      .update({ message: def.message })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { message: def.message };
  });
