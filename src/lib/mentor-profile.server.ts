import { supabaseAdmin } from "@/integrations/supabase/client.server";

export interface PublicMentorProfile {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  motto: string | null;
  country: string | null;
  timezone: string | null;
}

export async function fetchPublicMentorProfile(
  userId: string,
): Promise<PublicMentorProfile | null> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("first_name, last_name, display_name, avatar_url, bio, bio_custom, motto, country, timezone")
    .eq("id", userId)
    .maybeSingle();
  if (error) {
    console.error("[fetchPublicMentorProfile]", error);
    return null;
  }
  if (!data) return null;
  return {
    first_name: data.first_name ?? null,
    last_name: data.last_name ?? null,
    display_name: (data as { display_name?: string | null }).display_name ?? null,
    avatar_url: data.avatar_url ?? null,
    bio: data.bio_custom ?? data.bio ?? null,
    motto: (data as { motto?: string | null }).motto ?? null,
    country: (data as { country?: string | null }).country ?? null,
    timezone: (data as { timezone?: string | null }).timezone ?? null,
  };
}
