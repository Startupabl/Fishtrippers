// Short-lived checkout draft. Populated by the PreBookingDialog "Reserve" CTA
// and consumed by /checkout. Not persisted — closing the tab cancels.

import { create } from "zustand";

export interface CheckoutSelection {
  pathId: string;
  mentorId: string;
  mentorName: string;
  mentorAvatarUrl: string;
  pathTitle: string;
  highlights: string[];
  priceMinor: number;
  currency: string;
  sessionDateIso: string;
  sessionTimezone: string;
  customOffer?: {
    threadId: string;
    messageId: string;
    description: string;
    sessions: number;
  } | null;
  giftCard?: {
    code: string;
    amountMinor: number; // in selection.currency, after FX from USD
    currency: string;
  } | null;
}

interface CheckoutState {
  selection: CheckoutSelection | null;
  setSelection: (sel: CheckoutSelection) => void;
  clear: () => void;
}

export const useCheckoutStore = create<CheckoutState>((set) => ({
  selection: null,
  setSelection: (sel) => set({ selection: sel }),
  clear: () => set({ selection: null }),
}));
