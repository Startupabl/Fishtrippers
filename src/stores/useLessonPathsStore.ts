// V1 in-memory store of published lesson paths.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PromoCode } from "@/lib/promo";
import type { JourneyCategory } from "@/data/lesson-paths";

export interface LessonPath {
  id: string;
  slug: string;
  title: string;
  description?: string;
  category?: JourneyCategory;
  priceMinor?: number;
  currency?: string;
  thumbnailDataUrl?: string;
  totalLessons?: number;
  totalMentorSessions?: number;
  durationWeeks?: number;
  sessionTitles?: string[];
  mentorSlug?: string;
  promoCode?: PromoCode;
  createdAtIso: string;
}

interface LessonPathsState {
  paths: Record<string, LessonPath>;
  publish: (
    p: Omit<LessonPath, "id" | "createdAtIso" | "slug"> & { slug?: string },
  ) => LessonPath;
  getBySlug: (slug: string) => LessonPath | undefined;
}

function slugify(input: string, fallback: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return s || fallback;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useLessonPathsStore = create<LessonPathsState>()(
  persist(
    (set, get) => ({
      paths: {},
      publish: (p) => {
        const id =
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `lp_${Date.now()}`;
        const slug = p.slug ?? slugify(p.title, `path-${id.slice(0, 6)}`);
        const path: LessonPath = {
          ...p,
          id,
          slug,
          createdAtIso: new Date().toISOString(),
        };
        set((s) => ({ paths: { ...s.paths, [id]: path } }));
        return path;
      },
      getBySlug: (slug) =>
        Object.values(get().paths).find((p) => p.slug === slug),
    }),
    {
      name: "aimentor-lesson-paths",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
