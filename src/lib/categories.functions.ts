// Server functions for the dynamic Categories taxonomy.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || `cat-${Date.now()}`
  );
}

export type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  image_url: string | null;
  is_featured: boolean;
  sort_order: number;
};

// PUBLIC
export const listCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, parent_id, image_url, is_featured, sort_order")
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
});

export const listFeaturedCategories = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, slug, parent_id, image_url, is_featured, sort_order")
    .eq("is_featured", true)
    .is("parent_id", null)
    .order("sort_order", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as CategoryRow[];
});

// ADMIN
const UpsertSchema = z.object({
  name: z.string().min(1).max(80),
  image_url: z.string().url().max(500).optional().nullable(),
  is_featured: z.boolean(),
  parent_id: z.string().uuid().optional().nullable(),
  sort_order: z.number().int().min(0).max(9999).optional(),
});

export const adminCreateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("categories").insert({
      name: data.name,
      slug: slugify(data.name),
      image_url: data.image_url ?? null,
      is_featured: data.is_featured,
      parent_id: data.parent_id ?? null,
      sort_order: data.sort_order ?? 100,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminUpdateCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    UpsertSchema.extend({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin
      .from("categories")
      .update({
        name: data.name,
        slug: slugify(data.name),
        image_url: data.image_url ?? null,
        is_featured: data.is_featured,
        parent_id: data.parent_id ?? null,
        ...(data.sort_order !== undefined ? { sort_order: data.sort_order } : {}),
      })
      .eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("categories").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
