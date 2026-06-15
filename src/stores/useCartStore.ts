// Persisted shopping cart. V1: single-currency, single-item checkout
// downstream, but the cart UI supports multiple add/remove operations.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  pathId: string;
  pathSlug: string;
  pathTitle: string;
  mentorName: string;
  mentorAvatarUrl: string;
  priceMinor: number;
  currency: string;
  addedAtIso: string;
}

interface CartState {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (pathId: string) => void;
  clear: () => void;
  subtotalMinor: () => number;
  currency: () => string;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) =>
          s.items.some((i) => i.pathId === item.pathId)
            ? s
            : { items: [...s.items, item] },
        ),
      remove: (pathId) =>
        set((s) => ({ items: s.items.filter((i) => i.pathId !== pathId) })),
      clear: () => set({ items: [] }),
      subtotalMinor: () =>
        get().items.reduce((sum, i) => sum + i.priceMinor, 0),
      currency: () => get().items[0]?.currency ?? "USD",
    }),
    {
      name: "cart-v1",
      version: 1,
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
      partialize: (s) => ({ items: s.items }),
    },
  ),
);
