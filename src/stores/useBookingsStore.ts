// Persisted bookings so the success page survives refresh.

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface Booking {
  bookingId: string;
  sessionId: string;
  pathId: string;
  pathTitle: string;
  mentorId: string;
  mentorName: string;
  mentorAvatarUrl: string;
  highlights: string[];
  sessionDateIso: string;
  sessionTimezone: string;
  priceMinor: number;
  currency: string;
  createdAtIso: string;
}

interface BookingsState {
  bookings: Record<string, Booking>;
  addBooking: (b: Booking) => void;
  getBooking: (id: string) => Booking | undefined;
}

export const useBookingsStore = create<BookingsState>()(
  persist(
    (set, get) => ({
      bookings: {},
      addBooking: (b) =>
        set((s) => ({ bookings: { ...s.bookings, [b.bookingId]: b } })),
      getBooking: (id) => get().bookings[id],
    }),
    {
      name: "aimentor-bookings",
      storage: createJSONStorage(() =>
        typeof window !== "undefined"
          ? window.localStorage
          : ({
              getItem: () => null,
              setItem: () => {},
              removeItem: () => {},
              length: 0,
              clear: () => {},
              key: () => null,
            } satisfies Storage),
      ),
    },
  ),
);
