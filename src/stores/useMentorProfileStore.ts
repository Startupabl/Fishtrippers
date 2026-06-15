// One-time mentor "About Me" profile. Persisted locally for V1 (no backend yet).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface MentorProfile {
  bio: string;
  photoDataUrl: string | null;
  displayName: string;
  hasCompletedSetup: boolean;
  applyBioToAll: boolean;
}

interface MentorProfileState extends MentorProfile {
  saveProfile: (input: {
    bio: string;
    photoDataUrl?: string | null;
    displayName?: string;
    applyBioToAll?: boolean;
  }) => void;
  reset: () => void;
}

const initial: MentorProfile = {
  bio: "",
  photoDataUrl: null,
  displayName: "",
  hasCompletedSetup: false,
  applyBioToAll: false,
};

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useMentorProfileStore = create<MentorProfileState>()(
  persist(
    (set) => ({
      ...initial,
      saveProfile: ({ bio, photoDataUrl, displayName, applyBioToAll }) =>
        set((s) => ({
          bio,
          photoDataUrl: photoDataUrl ?? s.photoDataUrl,
          displayName: displayName ?? s.displayName,
          applyBioToAll: applyBioToAll ?? s.applyBioToAll,
          hasCompletedSetup: true,
        })),
      reset: () => set({ ...initial }),
    }),
    {
      name: "aimentor-mentor-profile",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
