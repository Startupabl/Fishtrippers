import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type VerificationDocType = "id" | "license" | "insurance" | "vessel";

export type VerificationRow = {
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

const DOC_COLUMN: Record<VerificationDocType, keyof VerificationRow> = {
  id: "id_url",
  license: "license_url",
  insurance: "insurance_url",
  vessel: "vessel_doc_url",
};

function recomputeStatus(row: Pick<VerificationRow, "id_url" | "license_url" | "insurance_url" | "vessel_doc_url" | "is_charter_owner" | "status">, docReplaced: boolean): VerificationRow["status"] {
  // Verified is terminal from user side (only admin can change it).
  if (row.status === "Verified") return row.status;
  const required = [row.id_url, row.license_url, row.insurance_url];
  if (row.is_charter_owner) required.push(row.vessel_doc_url);
  const allPresent = required.every((v) => v != null && v !== "");
  // If admin rejected, keep Rejected until the user re-uploads a doc.
  if (row.status === "Rejected" && !docReplaced) return "Rejected";
  return allPresent ? "Documents Uploaded" : "Pending Verification";
}

export const getMyVerification = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<VerificationRow | null> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) throw error;
    return (data as VerificationRow | null) ?? null;
  });

export const upsertVerification = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    is_charter_owner?: boolean;
    doc_type?: VerificationDocType;
    storage_path?: string;
  }) => input)
  .handler(async ({ data, context }): Promise<VerificationRow> => {
    const { supabase, userId } = context;
    const existing = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (existing.error) throw existing.error;

    const current: Partial<VerificationRow> = (existing.data as VerificationRow | null) ?? {
      user_id: userId,
      is_charter_owner: false,
      id_url: null,
      license_url: null,
      insurance_url: null,
      vessel_doc_url: null,
      status: "Pending Verification",
    };

    if (typeof data.is_charter_owner === "boolean") {
      current.is_charter_owner = data.is_charter_owner;
    }
    if (data.doc_type && data.storage_path) {
      const col = DOC_COLUMN[data.doc_type];
      (current as Record<string, unknown>)[col] = data.storage_path;
    }

    const nextStatus = recomputeStatus({
      id_url: current.id_url ?? null,
      license_url: current.license_url ?? null,
      insurance_url: current.insurance_url ?? null,
      vessel_doc_url: current.vessel_doc_url ?? null,
      is_charter_owner: current.is_charter_owner ?? false,
      status: (current.status as VerificationRow["status"]) ?? "Pending Verification",
    }, !!(data.doc_type && data.storage_path));

    const payload = {
      user_id: userId,
      is_charter_owner: current.is_charter_owner ?? false,
      id_url: current.id_url ?? null,
      license_url: current.license_url ?? null,
      insurance_url: current.insurance_url ?? null,
      vessel_doc_url: current.vessel_doc_url ?? null,
      status: nextStatus,
    };

    const { data: upserted, error } = await supabase
      .from("verifications")
      .upsert(payload, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) throw error;
    return upserted as VerificationRow;
  });

export const getVerificationDocSignedUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { doc_type: VerificationDocType; user_id?: string }) => input)
  .handler(async ({ data, context }): Promise<{ url: string } | null> => {
    const { supabase, userId } = context;
    const targetUser = data.user_id ?? userId;
    const { data: row, error } = await supabase
      .from("verifications")
      .select("*")
      .eq("user_id", targetUser)
      .maybeSingle();
    if (error) throw error;
    if (!row) return null;
    const col = DOC_COLUMN[data.doc_type];
    const path = (row as Record<string, unknown>)[col] as string | null;
    if (!path) return null;
    const { data: signed, error: sErr } = await supabase.storage
      .from("verification-docs")
      .createSignedUrl(path, 60);
    if (sErr || !signed?.signedUrl) return null;
    return { url: signed.signedUrl };
  });
