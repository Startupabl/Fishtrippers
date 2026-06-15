// Persisted Mentor Express draft for the 3-step listing flow.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { PromoCode } from "@/lib/promo";
import type { CurrencyCode } from "@/stores/useCurrencyStore";
import type { ExperienceLevel } from "@/lib/journeys.shared";

export interface BasicsDraft {
  title: string;
  category: string;
  experienceLevel?: ExperienceLevel | null;
}

export interface DetailsDraft {
  description: string;
  totalLessons: number;
  totalMentorSessions: number;
  durationWeeks: number;
  priceMajor: number;
  currency: CurrencyCode;
  sessionTitles: string[];
  sessionDescriptions?: string[];
  tags: string[];
  capacity: number;
  sessionLengthMinutes: 30 | 45 | 60 | 90;
  mentorBio?: string;
  applyBioToAll?: boolean;
}

export interface ThumbnailDraft {
  dataUrl: string;
}

export interface ShowcaseImageDraft {
  url: string;
  storage_path: string;
  sort_order: number;
}

export interface ShowcaseDraft {
  videoUrl: string | null;
  audioUrl: string | null;
  images: ShowcaseImageDraft[];
  featuredImageUrl: string | null;
}

export interface MentorExpressDraft {
  draftId?: string;
  basics?: BasicsDraft;
  details?: DetailsDraft;
  thumbnail?: ThumbnailDraft;
  showcase?: ShowcaseDraft;
  marketing: {
    promoCode?: PromoCode;
  };
}

interface MentorExpressState extends MentorExpressDraft {
  setDraftId: (id: string | undefined) => void;
  setBasics: (b: BasicsDraft) => void;
  setDetails: (d: DetailsDraft) => void;
  setThumbnail: (t: ThumbnailDraft | undefined) => void;
  setShowcase: (s: ShowcaseDraft | undefined) => void;
  setPromoCode: (p: PromoCode) => void;
  clearPromoCode: () => void;
  hydrateFromDraft: (d: Partial<MentorExpressDraft>) => void;
  reset: () => void;
}

export const MENTOR_EXPRESS_STORAGE_KEY = "aimentor-mentor-express";
export const MENTOR_EXPRESS_NEW_LISTING_EVENT = "mentor-express:new-listing";

const createEmptyDraft = (): MentorExpressDraft => ({
  draftId: undefined,
  basics: undefined,
  details: undefined,
  thumbnail: undefined,
  showcase: undefined,
  marketing: {},
});

const initial: MentorExpressDraft = createEmptyDraft();

export function clearPersistedMentorExpressDraft() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(MENTOR_EXPRESS_STORAGE_KEY);
  }
}

export function startNewMentorExpressListing() {
  useMentorExpressStore.getState().reset();
  clearPersistedMentorExpressDraft();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(MENTOR_EXPRESS_NEW_LISTING_EVENT));
  }
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useMentorExpressStore = create<MentorExpressState>()(
  persist(
    (set) => ({
      ...initial,
      setDraftId: (draftId) => set(() => ({ draftId })),
      setBasics: (basics) => set(() => ({ basics })),
      setDetails: (details) => set(() => ({ details })),
      setThumbnail: (thumbnail) => set(() => ({ thumbnail })),
      setShowcase: (showcase) => set(() => ({ showcase })),
      setPromoCode: (p) =>
        set((s) => ({ marketing: { ...s.marketing, promoCode: p } })),
      clearPromoCode: () =>
        set((s) => ({ marketing: { ...s.marketing, promoCode: undefined } })),
      hydrateFromDraft: (d) =>
        set(() => ({
          ...createEmptyDraft(),
          ...d,
          marketing: d.marketing ?? {},
        })),
      reset: () => set(() => createEmptyDraft()),
    }),
    {
      name: MENTOR_EXPRESS_STORAGE_KEY,
      version: 3,
      migrate: (persisted: unknown, version) => {
        const base = (persisted as Partial<MentorExpressDraft>) ?? {};
        if (version < 3) {
          return { ...createEmptyDraft(), marketing: base.marketing ?? {} };
        }
        return { ...createEmptyDraft(), ...base, marketing: base.marketing ?? {} };
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
