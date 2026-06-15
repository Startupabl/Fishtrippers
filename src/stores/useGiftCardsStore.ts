// Persisted gift card ledger (V1 mock).

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { generateGiftCode } from "@/lib/gift-codes";

export interface GiftCard {
  code: string;
  amountMinor: number; // USD minor
  currency: "USD";
  balanceMinor: number; // V1: equals amount; consumed in full on redeem
  recipient: { name: string; email: string };
  message: string;
  fromName?: string;
  purchasedAtIso: string;
  redeemedAtIso?: string | null;
}

interface GiftCardsState {
  cards: Record<string, GiftCard>;
  purchase: (input: {
    amountMinor: number;
    recipient: { name: string; email: string };
    message?: string;
    fromName?: string;
  }) => GiftCard;
  findByCode: (code: string) => GiftCard | null;
  redeem: (code: string) => void;
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

export const useGiftCardsStore = create<GiftCardsState>()(
  persist(
    (set, get) => ({
      cards: {},
      purchase: ({ amountMinor, recipient, message, fromName }) => {
        // generate a unique code
        let code = generateGiftCode();
        while (get().cards[code]) code = generateGiftCode();
        const card: GiftCard = {
          code,
          amountMinor,
          currency: "USD",
          balanceMinor: amountMinor,
          recipient,
          message: message ?? "",
          fromName,
          purchasedAtIso: new Date().toISOString(),
          redeemedAtIso: null,
        };
        set((s) => ({ cards: { ...s.cards, [code]: card } }));
        return card;
      },
      findByCode: (code) => get().cards[code] ?? null,
      redeem: (code) =>
        set((s) => {
          const card = s.cards[code];
          if (!card || card.redeemedAtIso) return s;
          return {
            cards: {
              ...s.cards,
              [code]: {
                ...card,
                balanceMinor: 0,
                redeemedAtIso: new Date().toISOString(),
              },
            },
          };
        }),
      clear: () => set({ cards: {} }),
    }),
    {
      name: "aimentor-gift-cards-v1",
      storage: createJSONStorage(() =>
        typeof window !== "undefined" ? window.localStorage : noopStorage,
      ),
    },
  ),
);
