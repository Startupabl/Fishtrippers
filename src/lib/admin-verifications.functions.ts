import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const DocTypeSchema = z.enum(["id", "license", "insurance", "vessel"]);
const DOC_COLUMN: Record<string, string> = {
  id: "id_url",
  license: "license_url",
  insurance: "insurance_url",
  vessel: "vessel_doc_url",
};

async function assertAdmin(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

export type AdminVerificationRow = {
  id: string;
  user_id: string;
  is_charter_owner: boolean;
  id_url: string | null;
  license_url: string | null;
  insurance_url: string | null;
  vessel_doc_url: string | null;
  status: "Pending Verification" | "Documents Uploaded" | "Verified" | "Rejected";
  created_at: string;
  updated_at: string;
};

export const getVerificationForOwner = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ owner_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }): Promise<AdminVerificationRow | null> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("verifications")
      .select("*")
      .eq("user_id", data.owner_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (row as AdminVerificationRow | null) ?? null;
  });

export const getAdminVerificationDocUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ user_id: z.string().uuid(), doc_type: DocTypeSchema }).parse(input),
  )
  .handler(async ({ context, data }): Promise<{ url: string } | null> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("verifications")
      .select("*")
      .eq("user_id", data.user_id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const col = DOC_COLUMN[data.doc_type];
    const path = (row as Record<string, unknown>)[col] as string | null;
    if (!path) return null;
    const { data: signed, error: sErr } = await supabaseAdmin.storage
      .from("verification-docs")
      .createSignedUrl(path, 60);
    if (sErr || !signed?.signedUrl) return null;
    return { url: signed.signedUrl };
  });

export const setVerificationStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        user_id: z.string().uuid(),
        status: z.enum(["Verified", "Rejected"]),
        note: z.string().trim().max(2000).optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await (supabaseAdmin.from("verifications") as any)
      .update({ status: data.status })
      .eq("user_id", data.user_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
