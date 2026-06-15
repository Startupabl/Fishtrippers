// Server functions for the Admin Search & SEO tag manager.
// Tags now support a many-to-many link to top-level (parent) categories
// via the `tag_category_links` join table. The list of allowable category
// names is sourced dynamically from the `categories` table (parent rows only).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

const nameSchema = z.string().trim().min(1).max(80);

export type TagWithCategories = {
  id: string;
  name: string;
  is_public: boolean;
  category_ids: string[];
  category_names: string[];
  created_at?: string;
  updated_at?: string;
};

async function assertAdmin(userId: string) {
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  if (error || !data) throw new Error("Forbidden");
}

// Fetch the lookup map of all parent (main) categories for joining/labeling.
async function loadParentCategoryMap() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("id, name, parent_id")
    .is("parent_id", null);
  if (error) throw new Error(error.message);
  const byId = new Map<string, string>();
  for (const c of data ?? []) byId.set(c.id as string, c.name as string);
  return byId;
}

async function loadLinksForTags(tagIds: string[]) {
  if (tagIds.length === 0) return new Map<string, string[]>();
  const { data, error } = await supabaseAdmin
    .from("tag_category_links")
    .select("tag_id, category_id")
    .in("tag_id", tagIds);
  if (error) throw new Error(error.message);
  const map = new Map<string, string[]>();
  for (const r of data ?? []) {
    const arr = map.get(r.tag_id as string) ?? [];
    arr.push(r.category_id as string);
    map.set(r.tag_id as string, arr);
  }
  return map;
}

async function attachCategories(
  rows: Array<{ id: string; name: string; is_public: boolean; created_at?: string; updated_at?: string }>,
): Promise<TagWithCategories[]> {
  const [catMap, linkMap] = await Promise.all([
    loadParentCategoryMap(),
    loadLinksForTags(rows.map((r) => r.id)),
  ]);
  return rows.map((r) => {
    const ids = linkMap.get(r.id) ?? [];
    return {
      ...r,
      category_ids: ids,
      category_names: ids.map((id) => catMap.get(id) ?? "").filter(Boolean),
    };
  });
}

export const listPublicTags = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("tags")
    .select("id, name, is_public")
    .eq("is_public", true)
    .order("name", { ascending: true });
  if (error) throw new Error(error.message);
  const tags = await attachCategories(
    (data ?? []).map((r) => ({
      id: r.id as string,
      name: r.name as string,
      is_public: r.is_public as boolean,
    })),
  );
  return { tags };
});

export const listTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("tags")
      .select("id, name, is_public, created_at, updated_at")
      .order("name", { ascending: true });
    if (error) throw new Error(error.message);
    const tags = await attachCategories(
      (data ?? []).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        is_public: r.is_public as boolean,
        created_at: r.created_at as string,
        updated_at: r.updated_at as string,
      })),
    );
    return { tags };
  });

async function setTagCategoryLinks(tagId: string, categoryIds: string[]) {
  const unique = Array.from(new Set(categoryIds));
  // Replace all existing links with the new set.
  const { error: delErr } = await supabaseAdmin
    .from("tag_category_links")
    .delete()
    .eq("tag_id", tagId);
  if (delErr) throw new Error(delErr.message);
  if (unique.length === 0) return;
  const { error: insErr } = await supabaseAdmin
    .from("tag_category_links")
    .insert(unique.map((cid) => ({ tag_id: tagId, category_id: cid })));
  if (insErr) throw new Error(insErr.message);
}

export const createTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: nameSchema,
        category_ids: z.array(z.string().uuid()).min(1).max(20),
        is_public: z.boolean().optional().default(true),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("tags")
      .insert({ name: data.name, is_public: data.is_public })
      .select("id, name, is_public")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("A tag with that name already exists.");
      throw new Error(error.message);
    }
    await setTagCategoryLinks(row.id as string, data.category_ids);
    return { tag: row };
  });

export const updateTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        id: z.string().uuid(),
        name: nameSchema.optional(),
        category_ids: z.array(z.string().uuid()).max(20).optional(),
        is_public: z.boolean().optional(),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const patch: { name?: string; is_public?: boolean } = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.is_public !== undefined) patch.is_public = data.is_public;

    // If renaming, also rewrite occurrences in journeys.tags arrays.
    let oldName: string | null = null;
    if (data.name !== undefined) {
      const { data: current } = await supabaseAdmin
        .from("tags")
        .select("name")
        .eq("id", data.id)
        .maybeSingle();
      oldName = (current?.name as string | undefined) ?? null;
    }

    if (Object.keys(patch).length > 0) {
      const { error } = await supabaseAdmin
        .from("tags")
        .update(patch)
        .eq("id", data.id);
      if (error) {
        if (error.code === "23505") throw new Error("A tag with that name already exists.");
        throw new Error(error.message);
      }
    }

    if (data.category_ids !== undefined) {
      await setTagCategoryLinks(data.id, data.category_ids);
    }

    if (oldName && data.name && oldName !== data.name) {
      const { data: rows } = await supabaseAdmin
        .from("journeys")
        .select("id, tags")
        .contains("tags", [oldName]);
      for (const r of rows ?? []) {
        const next = Array.from(
          new Set(((r.tags as string[]) ?? []).map((t) => (t === oldName ? data.name! : t))),
        );
        await supabaseAdmin.from("journeys").update({ tags: next }).eq("id", r.id);
      }
    }

    return { ok: true };
  });

export const deleteTag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: tag } = await supabaseAdmin
      .from("tags")
      .select("name")
      .eq("id", data.id)
      .maybeSingle();

    if (tag?.name) {
      const tagName = tag.name as string;
      const { data: rows } = await supabaseAdmin
        .from("journeys")
        .select("id, tags")
        .contains("tags", [tagName]);
      for (const r of rows ?? []) {
        const next = ((r.tags as string[]) ?? []).filter((t) => t !== tagName);
        await supabaseAdmin.from("journeys").update({ tags: next }).eq("id", r.id);
      }
    }

    const { error } = await supabaseAdmin.from("tags").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const mergeTags = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        masterId: z.string().uuid(),
        duplicateIds: z.array(z.string().uuid()).min(1).max(50),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: result, error } = await supabaseAdmin.rpc("merge_tags", {
      _master_id: data.masterId,
      _dup_ids: data.duplicateIds,
    });
    if (error) throw new Error(error.message);
    return result as { affected_journeys: number; merged_count: number };
  });

export const listUnknownTags = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    // Use the user-scoped client so auth.uid() is set inside the SECURITY DEFINER RPC
    const { data, error } = await context.supabase.rpc("list_unknown_tags");
    if (error) throw new Error(error.message);
    return {
      suggestions: (data ?? []) as { name: string; usage_count: number }[],
    };
  });

export const approveSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        name: nameSchema,
        category_ids: z.array(z.string().uuid()).min(1).max(20),
      })
      .parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: row, error } = await supabaseAdmin
      .from("tags")
      .insert({ name: data.name, is_public: true })
      .select("id, name, is_public")
      .single();
    if (error) {
      if (error.code === "23505") throw new Error("A tag with that name already exists.");
      throw new Error(error.message);
    }
    await setTagCategoryLinks(row.id as string, data.category_ids);

    const lower = data.name.toLowerCase().trim();
    const { data: rows } = await supabaseAdmin.from("journeys").select("id, tags");
    for (const r of rows ?? []) {
      const tagsArr = (r.tags as string[]) ?? [];
      if (tagsArr.some((t) => t.toLowerCase().trim() === lower && t !== data.name)) {
        const next = Array.from(
          new Set(
            tagsArr.map((t) => (t.toLowerCase().trim() === lower ? data.name : t)),
          ),
        );
        await supabaseAdmin.from("journeys").update({ tags: next }).eq("id", r.id);
      }
    }
    return { tag: row };
  });

export const redirectSuggestion = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ fromName: nameSchema, toTagId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { data: master } = await supabaseAdmin
      .from("tags")
      .select("name")
      .eq("id", data.toTagId)
      .maybeSingle();
    const masterName = master?.name as string | undefined;
    if (!masterName) throw new Error("Master tag not found");

    const fromLower = data.fromName.toLowerCase().trim();
    const { data: rows } = await supabaseAdmin.from("journeys").select("id, tags");
    let affected = 0;
    for (const r of rows ?? []) {
      const tagsArr = (r.tags as string[]) ?? [];
      if (tagsArr.some((t) => t.toLowerCase().trim() === fromLower)) {
        const next = Array.from(
          new Set(
            tagsArr.map((t) =>
              t.toLowerCase().trim() === fromLower ? masterName : t,
            ),
          ),
        );
        await supabaseAdmin.from("journeys").update({ tags: next }).eq("id", r.id);
        affected += 1;
      }
    }
    return { affected };
  });
