// Server functions for the Showcase Studio portfolio.
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { PortfolioAsset } from "@/lib/journeys.functions";

const AssetSchema = z.object({
  id: z.string().min(1),
  type: z.enum(["image", "video", "music"]),
  url: z.string().url().max(2048),
  thumbnail_url: z.string().url().max(2048).nullable(),
  title: z.string().max(300).nullable(),
  caption: z.string().max(500).nullable(),
  provider: z
    .enum(["youtube", "vimeo", "soundcloud", "spotify"])
    .nullable(),
  storage_path: z.string().max(500).nullable(),
  is_hero: z.boolean(),
});

const MAX_IMAGES = 5;
const MAX_LINKS = 2;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function loadAssets(supabase: any, journeyId: string, userId: string): Promise<PortfolioAsset[]> {
  const { data, error } = await supabase
    .from("journeys")
    .select("portfolio_assets")
    .eq("id", journeyId)
    .eq("mentor_id", userId)
    .single();
  if (error) throw new Error(error.message);
  return (data?.portfolio_assets ?? []) as unknown as PortfolioAsset[];
}

export const getJourneyPortfolio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ journeyId: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("journeys")
      .select("id, title, mentor_id, portfolio_assets, showcase_intro")
      .eq("id", data.journeyId)
      .eq("mentor_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    const { data: prof } = await supabase
      .from("profiles")
      .select("first_name, display_name")
      .eq("id", userId)
      .maybeSingle();
    const dn = (prof?.display_name ?? "").trim();
    const fn = (prof?.first_name ?? "").trim();
    const mentor_first_name =
      (dn ? dn.split(/\s+/)[0] : "") || fn || null;

    if (!row) {
      return {
        id: data.journeyId,
        title: "",
        portfolio_assets: [] as PortfolioAsset[],
        showcase_intro: null as string | null,
        mentor_first_name,
      };
    }
    return {
      id: row.id,
      title: row.title,
      portfolio_assets: ((row.portfolio_assets ?? []) as unknown as PortfolioAsset[]),
      showcase_intro: (row.showcase_intro ?? null) as string | null,
      mentor_first_name,
    };
  });


export const updateShowcaseIntro = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        intro: z.string().max(500).nullable(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("journeys")
      .update({ showcase_intro: data.intro })
      .eq("id", data.journeyId)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const addPortfolioAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ journeyId: z.string().uuid(), asset: AssetSchema })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const assets = await loadAssets(supabase, data.journeyId, userId);
    const imageCount = assets.filter((a) => a.type === "image").length;
    const linkCount = assets.filter((a) => a.type !== "image").length;
    if (data.asset.type === "image" && imageCount >= MAX_IMAGES) {
      throw new Error("Your Lab is full! Remove an image to add a new one.");
    }
    if (data.asset.type !== "image" && linkCount >= MAX_LINKS) {
      throw new Error("You can only add 2 video/music links per listing.");
    }
    const next = [...assets, data.asset];
    const { error } = await supabase
      .from("journeys")
      .update({ portfolio_assets: next as unknown as never })
      .eq("id", data.journeyId)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { assets: next };
  });

export const updatePortfolioAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        assetId: z.string().min(1),
        patch: z.object({
          caption: z.string().max(500).nullable().optional(),
          is_hero: z.boolean().optional(),
        }),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const assets = await loadAssets(supabase, data.journeyId, userId);
    const next = assets.map((a) => {
      if (a.id !== data.assetId) {
        // If we're setting another item as hero, clear this one.
        return data.patch.is_hero === true ? { ...a, is_hero: false } : a;
      }
      return {
        ...a,
        caption: data.patch.caption !== undefined ? data.patch.caption : a.caption,
        is_hero: data.patch.is_hero !== undefined ? data.patch.is_hero : a.is_hero,
      };
    });
    const { error } = await supabase
      .from("journeys")
      .update({ portfolio_assets: next as unknown as never })
      .eq("id", data.journeyId)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { assets: next };
  });

export const removePortfolioAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({ journeyId: z.string().uuid(), assetId: z.string().min(1) })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const assets = await loadAssets(supabase, data.journeyId, userId);
    const target = assets.find((a) => a.id === data.assetId);
    const next = assets.filter((a) => a.id !== data.assetId);
    if (target?.storage_path) {
      await supabase.storage.from("listing-portfolio").remove([target.storage_path]);
    }
    const { error } = await supabase
      .from("journeys")
      .update({ portfolio_assets: next as unknown as never })
      .eq("id", data.journeyId)
      .eq("mentor_id", userId);
    if (error) throw new Error(error.message);
    return { assets: next };
  });

// ---------------------------------------------------------------------------
// oEmbed metadata fetch (server-side to avoid CORS).
// ---------------------------------------------------------------------------

type Provider = "youtube" | "vimeo" | "soundcloud" | "spotify";

function detectProvider(url: string): Provider | null {
  const u = url.toLowerCase();
  if (u.includes("youtube.com") || u.includes("youtu.be")) return "youtube";
  if (u.includes("vimeo.com")) return "vimeo";
  if (u.includes("soundcloud.com")) return "soundcloud";
  if (u.includes("spotify.com")) return "spotify";
  return null;
}

function oembedEndpoint(provider: Provider, url: string): string {
  const enc = encodeURIComponent(url);
  switch (provider) {
    case "youtube":
      return `https://www.youtube.com/oembed?url=${enc}&format=json`;
    case "vimeo":
      return `https://vimeo.com/api/oembed.json?url=${enc}`;
    case "soundcloud":
      return `https://soundcloud.com/oembed?url=${enc}&format=json`;
    case "spotify":
      return `https://open.spotify.com/oembed?url=${enc}`;
  }
}

export const fetchOembed = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ url: z.string().url().max(2048) }).parse(input),
  )
  .handler(async ({ data }) => {
    const provider = detectProvider(data.url);
    if (!provider) {
      return { provider: null, title: null, thumbnail_url: null };
    }
    try {
      const res = await fetch(oembedEndpoint(provider, data.url), {
        headers: { Accept: "application/json" },
      });
      if (!res.ok) {
        return { provider, title: null, thumbnail_url: null };
      }
      const json = (await res.json()) as {
        title?: string;
        thumbnail_url?: string;
      };
      return {
        provider,
        title: json.title ?? null,
        thumbnail_url: json.thumbnail_url ?? null,
      };
    } catch (err) {
      console.error("[fetchOembed]", err);
      return { provider, title: null, thumbnail_url: null };
    }
  });

// ---------------------------------------------------------------------------
// Public flag — anyone can report inappropriate content.
// ---------------------------------------------------------------------------

export const flagPortfolioAsset = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        journeyId: z.string().uuid(),
        assetId: z.string().max(100).optional(),
        reason: z.string().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase
      .from("journey_portfolio_flags")
      .insert({
        journey_id: data.journeyId,
        asset_id: data.assetId ?? null,
        reason: data.reason ?? null,
        reporter_id: context.userId,
      });
    if (error) {
      console.error("[flagPortfolioAsset]", error);
      throw new Error("Could not submit your report.");
    }
    return { ok: true };
  });

// ---------------------------------------------------------------------------
// Upload helper used by the Studio UI (client-side).
// ---------------------------------------------------------------------------

export async function uploadPortfolioImage(
  blob: Blob,
  ext: string,
  userId: string,
  journeyId: string,
): Promise<{ url: string; storage_path: string }> {
  const filename = `${crypto.randomUUID()}.${ext.toLowerCase()}`;
  const path = `${userId}/${journeyId}/${filename}`;
  const { error } = await supabase.storage
    .from("listing-portfolio")
    .upload(path, blob, {
      cacheControl: "3600",
      upsert: false,
      contentType: blob.type || `image/${ext}`,
    });
  if (error) throw new Error(error.message);
  const { data } = supabase.storage.from("listing-portfolio").getPublicUrl(path);
  return { url: data.publicUrl, storage_path: path };
}
