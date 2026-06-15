import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads an avatar image (from a data URL) to the public `avatars` bucket
 * and returns a cache-busted public URL. Does NOT write to the profiles row.
 */
export async function uploadAvatarFromDataUrl(
  userId: string,
  dataUrl: string,
): Promise<string> {
  const res = await fetch(dataUrl);
  const blob = await res.blob();
  const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
  const path = `${userId}/avatar.${ext}`;
  const { error: upErr } = await supabase.storage
    .from("avatars")
    .upload(path, blob, { upsert: true, contentType: blob.type });
  if (upErr) throw upErr;
  const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
  return `${pub.publicUrl}?t=${Date.now()}`;
}
