// Upload a cropped cover image (Blob) to the public `course-covers` bucket.
import { supabase } from "@/integrations/supabase/client";

export async function uploadCoverImage(
  blob: Blob,
  ext: string,
  userId: string,
  journeyId?: string,
): Promise<string> {
  const filename = `${journeyId ?? "draft"}-${Date.now()}.${ext}`;
  const path = `${userId}/${filename}`;
  const { error } = await supabase.storage
    .from("course-covers")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || `image/${ext}`,
    });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("course-covers").getPublicUrl(path);
  return data.publicUrl;
}
