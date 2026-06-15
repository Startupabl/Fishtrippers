// Client-side upload helper for showcase gallery images.
import { supabase } from "@/integrations/supabase/client";

export const SHOWCASE_MAX_IMAGES = 8;
export const SHOWCASE_MAX_BYTES = 5 * 1024 * 1024;
export const SHOWCASE_ACCEPT_EXT = ["jpg", "jpeg", "png", "webp"] as const;

export async function uploadShowcaseImage(
  blob: Blob,
  ext: string,
  userId: string,
  journeyId: string,
): Promise<{ url: string; storage_path: string }> {
  const clean = ext.toLowerCase().replace(/[^a-z0-9]/g, "") || "jpg";
  const filename = `${crypto.randomUUID()}.${clean}`;
  const path = `${userId}/${journeyId}/showcase/${filename}`;
  const { error } = await supabase.storage
    .from("listing-portfolio")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || `image/${clean}`,
    });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("listing-portfolio").getPublicUrl(path);
  return { url: data.publicUrl, storage_path: path };
}

export async function deleteShowcaseImage(storage_path: string): Promise<void> {
  if (!storage_path) return;
  await supabase.storage.from("listing-portfolio").remove([storage_path]);
}
