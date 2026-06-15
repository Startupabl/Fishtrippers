import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export type CurrencyCode = "USD" | "EUR" | "GBP" | "CAD" | "AUD";

interface CurrencyState {
  currency: CurrencyCode;
  hasManualCurrency: boolean;
  setCurrency: (c: CurrencyCode, manual?: boolean) => void;
}

const noopStorage: Storage = {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
  length: 0,
  clear: () => {},
  key: () => null,
};

export const useCurrencyStore = create<CurrencyState>()(
  persist(
    (set) => ({
      currency: "USD",
      hasManualCurrency: false,
      setCurrency: (currency, manual = true) =>
        set((s) => ({
          currency,
          hasManualCurrency: manual ? true : s.hasManualCurrency,
        })),
    }),
    {
      name: "currency-v1",
      version: 2,
      migrate: (persisted: unknown) => {
        const base = (persisted as Partial<CurrencyState>) ?? {};
        return {
          currency: base.currency ?? "USD",
          hasManualCurrency: base.hasManualCurrency ?? true,
        } as CurrencyState;
      },
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
