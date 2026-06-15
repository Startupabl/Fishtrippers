// Admin server functions for the email_templates manager. Keep this file
// thin: only createServerFn declarations + their imports, so the top-level
// `client.server` import does not leak into the client bundle.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import {
  EMAIL_TEMPLATE_DEFAULTS,
  type EmailTemplatePurpose,
} from "./email-templates.defaults";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export interface EmailTemplateRow {
  id: string;
  purpose: string;
  display_name: string;
  description: string | null;
  subject: string;
  body: string;
  variables: string[];
  is_system: boolean;
  updated_at: string;
}

export const listEmailTemplates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("email_templates")
      .select("id, purpose, display_name, description, subject, body, variables, is_system, updated_at")
      .order("display_name", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as EmailTemplateRow[];
  });

export const updateEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        subject: z.string().min(1).max(500),
        body: z.string().min(1).max(20000),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("email_templates")
      .update({ subject: data.subject, body: data.body })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const resetEmailTemplate = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ id: z.string().uuid(), purpose: z.string().min(1) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const def = EMAIL_TEMPLATE_DEFAULTS[data.purpose as EmailTemplatePurpose];
    if (!def) throw new Error("No default for purpose: " + data.purpose);
    const { error } = await supabaseAdmin
      .from("email_templates")
      .update({ subject: def.subject, body: def.body })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { subject: def.subject, body: def.body };
  });

