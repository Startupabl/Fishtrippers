// Server functions for the Site Pages CMS (footer + /pages/$slug).
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import sanitizeHtml from "sanitize-html";
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

const SANITIZE_OPTS: sanitizeHtml.IOptions = {
  allowedTags: [
    "h1", "h2", "h3", "h4", "p", "a", "strong", "em",
    "ul", "ol", "li", "br", "hr", "blockquote", "code", "pre", "img",
  ],
  allowedAttributes: {
    a: ["href", "target", "rel"],
    img: ["src", "alt", "title", "width", "height"],
    code: ["class"],
    pre: ["class"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  allowedSchemesByTag: {
    img: ["http", "https"],
  },
  transformTags: {
    a: sanitizeHtml.simpleTransform("a", { rel: "noopener noreferrer" }, true),
  },
};

const CategoryEnum = z.enum(["learning_teaching", "support_safety", "legal"]);
const StatusEnum = z.enum(["live", "draft"]);

const UpsertSchema = z
  .object({
    id: z.string().uuid().optional(),
    slug: z
      .string()
      .min(1)
      .max(120)
      .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase letters, numbers, and dashes"),
    title: z.string().min(1).max(200),
    category: CategoryEnum,
    order_priority: z.number().int().min(0).max(9999),
    is_external: z.boolean(),
    external_url: z.string().url().max(500).optional().nullable(),
    status: StatusEnum,
    description: z.string().max(500).optional().nullable(),
    content_html: z.string().max(50000).optional().nullable(),
  })
  .refine(
    (v) => !v.is_external || (v.external_url && v.external_url.length > 0),
    { message: "External URL is required when External link is on", path: ["external_url"] },
  );

// PUBLIC — used by footer + /pages/$slug. No auth required.
export const listLivePages = createServerFn({ method: "GET" }).handler(async () => {
  const { data, error } = await supabaseAdmin
    .from("site_pages")
    .select("id, slug, title, category, order_priority, is_external, external_url")
    .eq("status", "live")
    .order("category", { ascending: true })
    .order("order_priority", { ascending: true })
    .order("title", { ascending: true });
  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getLivePageBySlug = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => z.object({ slug: z.string().min(1).max(120) }).parse(input))
  .handler(async ({ data }) => {
    const { data: row, error } = await supabaseAdmin
      .from("site_pages")
      .select("id, slug, title, category, description, content_html, is_external, external_url, status, updated_at")
      .eq("slug", data.slug)
      .eq("status", "live")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

// ADMIN
export const adminListPages = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { data, error } = await supabaseAdmin
      .from("site_pages")
      .select("*")
      .order("category", { ascending: true })
      .order("order_priority", { ascending: true });
    if (error) throw new Error(error.message);
    return data ?? [];
  });

export const adminUpsertPage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertSchema.parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const cleanHtml = data.content_html ? sanitizeHtml(data.content_html, SANITIZE_OPTS) : null;
    const payload = {
      slug: data.slug,
      title: data.title,
      category: data.category,
      order_priority: data.order_priority,
      is_external: data.is_external,
      external_url: data.is_external ? data.external_url ?? null : null,
      status: data.status,
      description: data.description ?? null,
      content_html: data.is_external ? null : cleanHtml,
    };

    if (data.id) {
      const { error } = await supabaseAdmin.from("site_pages").update(payload).eq("id", data.id);
      if (error) throw new Error(error.message);
      return { ok: true, id: data.id };
    }
    const { data: row, error } = await supabaseAdmin
      .from("site_pages")
      .insert(payload)
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    return { ok: true, id: row.id };
  });

export const adminDeletePage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ context, data }) => {
    await assertAdmin(context.userId);
    const { error } = await supabaseAdmin.from("site_pages").delete().eq("id", data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
