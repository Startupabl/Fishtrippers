import { supabase } from "@/integrations/supabase/client";

export const VERIFICATION_MAX_BYTES = 10 * 1024 * 1024;
export const VERIFICATION_ALLOWED_EXT = ["pdf", "jpg", "jpeg", "png"] as const;
export const VERIFICATION_ACCEPT = ".pdf,.jpg,.jpeg,.png";

export type VerificationDocType = "id" | "license" | "insurance" | "vessel";

export function validateVerificationFile(file: File): string | null {
  if (file.size > VERIFICATION_MAX_BYTES) return "File must be 10MB or smaller.";
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (!VERIFICATION_ALLOWED_EXT.includes(ext as (typeof VERIFICATION_ALLOWED_EXT)[number])) {
    return "File must be a PDF, JPG, or PNG.";
  }
  return null;
}

export async function uploadVerificationDoc(
  file: File,
  userId: string,
  docType: VerificationDocType,
): Promise<string> {
  const err = validateVerificationFile(file);
  if (err) throw new Error(err);
  const ext = file.name.split(".").pop()!.toLowerCase();
  const path = `${userId}/${docType}.${ext}`;

  // Remove any prior file at a different extension for this slot.
  const { data: existing } = await supabase.storage
    .from("verification-docs")
    .list(userId, { search: docType });
  if (existing?.length) {
    const stale = existing
      .filter((f) => f.name.startsWith(`${docType}.`) && f.name !== `${docType}.${ext}`)
      .map((f) => `${userId}/${f.name}`);
    if (stale.length) {
      await supabase.storage.from("verification-docs").remove(stale);
    }
  }

  const { error } = await supabase.storage
    .from("verification-docs")
    .upload(path, file, {
      upsert: true,
      cacheControl: "3600",
      contentType: file.type || `application/octet-stream`,
    });
  if (error) throw new Error(error.message);
  return path;
}
