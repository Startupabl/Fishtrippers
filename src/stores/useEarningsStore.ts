// Persisted ledger of mentor earnings entries (V1: populated on checkout success).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type EarningKind = "journey" | "custom_offer";

export interface EarningEntry {
  id: string;
  kind: EarningKind;
  label: string;
  mentorName: string;
  grossMinor: number;
  currency: string;
  createdAtIso: string;
}

interface EarningsState {
  entries: EarningEntry[];
  add: (e: Omit<EarningEntry, "id" | "createdAtIso">) => void;
  clear: () => void;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useEarningsStore = create<EarningsState>()(
  persist(
    (set) => ({
      entries: [],
      add: (e) =>
        set((s) => ({
          entries: [
            {
              ...e,
              id:
                typeof crypto !== "undefined" && "randomUUID" in crypto
                  ? crypto.randomUUID()
                  : `e_${Date.now()}`,
              createdAtIso: new Date().toISOString(),
            },
            ...s.entries,
          ],
        })),
      clear: () => set({ entries: [] }),
    }),
    {
      name: "aimentor-earnings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
