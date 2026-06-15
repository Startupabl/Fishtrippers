// Shared (non-server-fn) helpers for journeys server functions.
// Kept separate from journeys.functions.ts so the TanStack server-fn
// splitter can isolate each handler cleanly.

import { z } from "zod";

export interface PortfolioAsset {
  id: string;
  type: "image" | "video" | "music";
  url: string;
  thumbnail_url: string | null;
  title: string | null;
  caption: string | null;
  provider: "youtube" | "vimeo" | "soundcloud" | "spotify" | null;
  storage_path: string | null;
  is_hero: boolean;
}

export interface JourneyRow {
  id: string;
  slug: string | null;
  mentor_id: string;
  title: string;
  category: string | null;
  description: string | null;
  cover_image_url: string | null;
  base_price_minor: number;
  currency: string;
  session_count: number;
  extra_session_price_minor: number;
  tags: string[];
  capacity: number;
  session_length_minutes: number;
  course_id_slug: string;
  session_titles: string[];
  session_descriptions: string[];
  status: "draft" | "published" | "archived";
  moderation_status: "pending" | "approved" | "declined";
  moderation_note?: string | null;
  portfolio_assets?: PortfolioAsset[];
  showcase_intro?: string | null;
  mentor_bio?: string | null;
  featured?: boolean;
  experience_level?: "Beginner" | "Intermediate" | "Advanced" | null;
  showcase_video_url?: string | null;
  showcase_audio_url?: string | null;
  showcase_images?: ShowcaseImage[];
  featured_image_url?: string | null;
  mentor_display_name?: string | null;
  mentor_first_name?: string | null;
  mentor_last_name?: string | null;
  mentor_avatar_url?: string | null;
  mentor_motto?: string | null;
  review_avg?: number;
  review_count?: number;
}

export interface ShowcaseImage {
  url: string;
  storage_path: string;
  sort_order: number;
}

// Whitelist of safe showcase domains (matches the host or any subdomain of it).
// Untrusted hosts are still accepted on save, but the listing is flipped to
// `pending` for a quick admin review (see evaluateShowcaseUrlRisk).
export const SAFE_SHOWCASE_HOSTS = [
  "youtube.com", "youtu.be",
  "vimeo.com",
  "loom.com",
  "soundcloud.com",
  "spotify.com",
];

function hostMatchesSafeList(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return SAFE_SHOWCASE_HOSTS.some((safe) => h === safe || h.endsWith(`.${safe}`));
}

export function isSafeShowcaseUrl(url: string | null | undefined): boolean {
  if (!url) return true;
  try {
    return hostMatchesSafeList(new URL(url).hostname);
  } catch {
    return false;
  }
}

// Legacy aliases kept for any older imports.
export const isAllowedShowcaseVideoUrl = isSafeShowcaseUrl;
export const isAllowedShowcaseAudioUrl = isSafeShowcaseUrl;

const ShowcaseImageSchema = z.object({
  url: z.string().url().max(2048),
  storage_path: z.string().max(500),
  sort_order: z.number().int().min(0).max(100),
});
export const ShowcaseImagesSchema = z.array(ShowcaseImageSchema).max(8);

// URLs are saved regardless of host (data is preserved); host trust is
// evaluated server-side to decide whether the listing needs re-review.
export const ShowcaseVideoUrlSchema = z.string().trim().max(2048).url().nullable();
export const ShowcaseAudioUrlSchema = z.string().trim().max(2048).url().nullable();

// Returns the percent change between old and new minor-unit prices.
// If old was 0 and new is non-zero, treat as 100% (any price introduced).
export function priceChangePercent(oldMinor: number, newMinor: number): number {
  if (!Number.isFinite(oldMinor) || !Number.isFinite(newMinor)) return 0;
  if (oldMinor === 0) return newMinor === 0 ? 0 : 100;
  return Math.abs(newMinor - oldMinor) / Math.abs(oldMinor) * 100;
}

export type ReviewReason = "link" | "critical";

// Evaluate whether an edit on an already-approved listing should re-trigger
// admin review. `before` is the current DB row; `next` is the partial update.
export function evaluateEditRisk(
  before: Pick<JourneyRow, "moderation_status" | "base_price_minor" | "category" | "showcase_video_url" | "showcase_audio_url">,
  next: Partial<Pick<JourneyRow, "base_price_minor" | "category" | "showcase_video_url" | "showcase_audio_url">>,
): ReviewReason | null {
  if (before.moderation_status !== "approved") return null;

  if (next.showcase_video_url !== undefined && next.showcase_video_url !== before.showcase_video_url) {
    if (!isSafeShowcaseUrl(next.showcase_video_url)) return "link";
  }
  if (next.showcase_audio_url !== undefined && next.showcase_audio_url !== before.showcase_audio_url) {
    if (!isSafeShowcaseUrl(next.showcase_audio_url)) return "link";
  }

  if (next.base_price_minor !== undefined && next.base_price_minor !== before.base_price_minor) {
    if (priceChangePercent(before.base_price_minor, next.base_price_minor) > 20) return "critical";
  }
  if (next.category !== undefined && next.category !== before.category) {
    return "critical";
  }

  return null;
}

export const EXPERIENCE_LEVELS = ["Beginner", "Intermediate", "Advanced"] as const;
export type ExperienceLevel = (typeof EXPERIENCE_LEVELS)[number];

export interface JourneyWithStats {
  row: JourneyRow;
  enrolled: number;
  earned_minor: number;
}

export const JOURNEY_COLS =
  "id, slug, mentor_id, title, category, description, cover_image_url, base_price_minor, currency, session_count, extra_session_price_minor, tags, capacity, session_length_minutes, course_id_slug, session_titles, session_descriptions, status, moderation_status, moderation_note, portfolio_assets, showcase_intro, mentor_bio, featured, priority_order, created_at, experience_level, showcase_video_url, showcase_audio_url, showcase_images, featured_image_url";

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

/**
 * Build TanStack <Link> props pointing at the canonical SEO listing URL:
 *   /c/<category-slug>/<listing-slug>
 * Falls back to the legacy /p/<slug> route only if the slug is missing.
 */
export function listingLinkProps(input: {
  slug?: string | null;
  category?: string | null;
}): { to: "/c/$categorySlug/$listingSlug"; params: { categorySlug: string; listingSlug: string } } {
  const listingSlug = (input.slug ?? "").trim();
  const categorySlug = slugify(input.category ?? "") || "listings";
  return {
    to: "/c/$categorySlug/$listingSlug",
    params: { categorySlug, listingSlug },
  };
}


export const SearchInput = z.object({
  q: z.string().max(200).optional().default(""),
  category: z.string().max(100).optional().default(""),
  tags: z.array(z.string().trim().min(1).max(40)).max(20).optional().default([]),
});

export const PublishInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().min(3).max(120),
  category: z.string().trim().min(1).max(80),
  description: z.string().trim().min(20).max(2000),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).default([]),
  base_price_minor: z.number().int().min(0).max(100_000_00),
  currency: z.string().length(3),
  session_count: z.number().int().min(1).max(50),
  extra_session_price_minor: z.number().int().min(0).max(100_000_00).default(6000),
  cover_image_url: z.string().max(2048).optional().nullable(),
  capacity: z.number().int().min(1).max(50).default(1),
  session_length_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]).default(45),
  mentor_bio: z.string().trim().max(1000).nullable().optional(),
  session_titles: z.array(z.string().trim().max(120)).max(50).optional(),
  session_descriptions: z.array(z.string().trim().max(600)).max(50).optional(),
  apply_bio_to_all: z.boolean().optional(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  showcase_video_url: ShowcaseVideoUrlSchema.optional(),
  showcase_audio_url: ShowcaseAudioUrlSchema.optional(),
  showcase_images: ShowcaseImagesSchema.optional(),
  featured_image_url: z.string().max(2048).nullable().optional(),
});

export const DraftInput = z.object({
  id: z.string().uuid().optional(),
  title: z.string().trim().max(120).optional(),
  category: z.string().trim().max(80).optional().nullable(),
  description: z.string().trim().max(2000).optional().nullable(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  base_price_minor: z.number().int().min(0).max(100_000_00).optional(),
  currency: z.string().length(3).optional(),
  session_count: z.number().int().min(1).max(50).optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  session_length_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]).optional(),
  session_titles: z.array(z.string().trim().max(120)).max(50).optional(),
  session_descriptions: z.array(z.string().trim().max(600)).max(50).optional(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  showcase_video_url: ShowcaseVideoUrlSchema.optional(),
  showcase_audio_url: ShowcaseAudioUrlSchema.optional(),
  showcase_images: ShowcaseImagesSchema.optional(),
  featured_image_url: z.string().max(2048).nullable().optional(),
  mentor_bio: z.string().trim().max(1000).nullable().optional(),
  cover_image_url: z.string().max(2048).nullable().optional(),
});

export const UpdateInput = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(3).max(120).optional(),
  category: z.string().trim().min(1).max(80).optional(),
  description: z.string().trim().min(20).max(2000).optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  base_price_minor: z.number().int().min(0).max(100_000_00).optional(),
  currency: z.string().length(3).optional(),
  session_count: z.number().int().min(1).max(50).optional(),
  extra_session_price_minor: z.number().int().min(0).max(100_000_00).optional(),
  cover_image_url: z.string().max(2048).nullable().optional(),
  capacity: z.number().int().min(1).max(50).optional(),
  session_length_minutes: z.union([z.literal(30), z.literal(45), z.literal(60), z.literal(90)]).optional(),
  mentor_bio: z.string().trim().max(1000).nullable().optional(),
  session_titles: z.array(z.string().trim().max(120)).max(50).optional(),
  session_descriptions: z.array(z.string().trim().max(600)).max(50).optional(),
  apply_bio_to_all: z.boolean().optional(),
  experience_level: z.enum(EXPERIENCE_LEVELS).nullable().optional(),
  showcase_video_url: ShowcaseVideoUrlSchema.optional(),
  showcase_audio_url: ShowcaseAudioUrlSchema.optional(),
  showcase_images: ShowcaseImagesSchema.optional(),
  featured_image_url: z.string().max(2048).nullable().optional(),
});

export function pickListingThumb(j: { featured_image_url?: string | null; cover_image_url?: string | null }): string | null {
  return j.featured_image_url || j.cover_image_url || null;
}
