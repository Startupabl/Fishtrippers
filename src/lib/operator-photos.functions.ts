import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export interface OperatorPhoto {
  id: string;
  operator_id: string;
  position: number;
  is_cover: boolean;
  storage_path: string;
  hero_url: string;
  gallery_url: string;
  thumb_url: string;
  width: number | null;
  height: number | null;
  bytes: number | null;
}

async function getOwnedOperatorId(supabase: any, userId: string): Promise<string> {
  const { data, error } = await supabase
    .from("operators")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No operator found for this user");
  return data.id as string;
}

export const listMyOperatorPhotos = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<OperatorPhoto[]> => {
    const { supabase, userId } = context;
    const operatorId = await getOwnedOperatorId(supabase, userId);
    const { data, error } = await supabase
      .from("operator_photos" as any)
      .select("*")
      .eq("operator_id", operatorId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (data ?? []) as OperatorPhoto[];
  });

export interface AddPhotoInput {
  storage_path: string;
  hero_url: string;
  gallery_url: string;
  thumb_url: string;
  width: number;
  height: number;
  bytes: number;
}

export const addOperatorPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: AddPhotoInput) => {
    if (
      !input?.storage_path ||
      !input?.hero_url ||
      !input?.gallery_url ||
      !input?.thumb_url
    ) {
      throw new Error("Missing required fields");
    }
    return input;
  })
  .handler(async ({ data, context }): Promise<OperatorPhoto> => {
    const { supabase, userId } = context;
    const operatorId = await getOwnedOperatorId(supabase, userId);

    const { data: existing } = await supabase
      .from("operator_photos" as any)
      .select("position")
      .eq("operator_id", operatorId)
      .order("position", { ascending: false })
      .limit(1);

    const nextPos =
      existing && existing.length > 0 ? (existing[0] as any).position + 1 : 0;

    const { data: inserted, error } = await supabase
      .from("operator_photos" as any)
      .insert({
        operator_id: operatorId,
        position: nextPos,
        is_cover: nextPos === 0, // default first photo as cover
        storage_path: data.storage_path,
        hero_url: data.hero_url,
        gallery_url: data.gallery_url,
        thumb_url: data.thumb_url,
        width: data.width,
        height: data.height,
        bytes: data.bytes,
      })
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return inserted as OperatorPhoto;
  });

export const deleteOperatorPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await getOwnedOperatorId(supabase, userId);

    const { data: photo, error: getErr } = await supabase
      .from("operator_photos" as any)
      .select("id, storage_path, operator_id")
      .eq("id", data.id)
      .maybeSingle();
    if (getErr) throw new Error(getErr.message);
    if (!photo || (photo as any).operator_id !== operatorId) {
      throw new Error("Photo not found");
    }

    // Remove blobs from storage (best-effort)
    const folder = (photo as any).storage_path as string;
    const files = ["hero.webp", "gallery.webp", "thumb.webp"].map(
      (n) => `${folder}/${n}`,
    );
    await supabase.storage.from("listing-portfolio").remove(files);

    const { error: delErr } = await supabase
      .from("operator_photos" as any)
      .delete()
      .eq("id", data.id);
    if (delErr) throw new Error(delErr.message);
    return { ok: true };
  });

export const setOperatorCoverPhoto = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { id: string }) => {
    if (!input?.id) throw new Error("Missing id");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await getOwnedOperatorId(supabase, userId);

    // Clear current cover first (unique partial index makes a single UPDATE
    // race-prone).
    const { error: clearErr } = await supabase
      .from("operator_photos" as any)
      .update({ is_cover: false })
      .eq("operator_id", operatorId)
      .eq("is_cover", true);
    if (clearErr) throw new Error(clearErr.message);

    const { error: setErr } = await supabase
      .from("operator_photos" as any)
      .update({ is_cover: true })
      .eq("operator_id", operatorId)
      .eq("id", data.id);
    if (setErr) throw new Error(setErr.message);
    return { ok: true };
  });

export const reorderOperatorPhotos = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { ids: string[] }) => {
    if (!Array.isArray(input?.ids)) throw new Error("Missing ids");
    return input;
  })
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await getOwnedOperatorId(supabase, userId);

    // Update one at a time — small list (<=15).
    for (let i = 0; i < data.ids.length; i++) {
      const { error } = await supabase
        .from("operator_photos" as any)
        .update({ position: i })
        .eq("operator_id", operatorId)
        .eq("id", data.ids[i]);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

// Public reader used by the listing page (no auth required)
export const getOperatorPhotosPublic = createServerFn({ method: "GET" })
  .inputValidator((input: { operatorId: string }) => {
    if (!input?.operatorId) throw new Error("Missing operatorId");
    return input;
  })
  .handler(async ({ data }): Promise<OperatorPhoto[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const sb = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const { data: rows, error } = await sb
      .from("operator_photos")
      .select("*")
      .eq("operator_id", data.operatorId)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return (rows ?? []) as OperatorPhoto[];
  });
