// Persisted learner onboarding answers. Used to pre-filter the search page.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import type { LearnerGoal, LearnerDevice, LearnerPace } from "@/data/lesson-paths";

export interface LearnerPrefs {
  goal?: LearnerGoal;
  device?: LearnerDevice;
  pace?: LearnerPace;
  completedAtIso?: string;
}

interface LearnerPrefsState extends LearnerPrefs {
  setGoal: (g: LearnerGoal) => void;
  setDevice: (d: LearnerDevice) => void;
  setPace: (p: LearnerPace) => void;
  reset: () => void;
  isComplete: () => boolean;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useLearnerPrefsStore = create<LearnerPrefsState>()(
  persist(
    (set, get) => ({
      goal: undefined,
      device: undefined,
      pace: undefined,
      completedAtIso: undefined,
      setGoal: (goal) => set({ goal }),
      setDevice: (device) => set({ device }),
      setPace: (pace) =>
        set({ pace, completedAtIso: new Date().toISOString() }),
      reset: () =>
        set({
          goal: undefined,
          device: undefined,
          pace: undefined,
          completedAtIso: undefined,
        }),
      isComplete: () => {
        const s = get();
        return !!(s.goal && s.device && s.pace);
      },
    }),
    {
      name: "learner-prefs-v1",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (s) => ({
        goal: s.goal,
        device: s.device,
        pace: s.pace,
        completedAtIso: s.completedAtIso,
      }),
    },
  ),
);
