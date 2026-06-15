import { create } from "zustand";

interface ProfileState {
  avatarUrl: string | null;
  lastName: string | null;
  country: string; // ISO-2; defaults to "US"
  timezone: string | null; // IANA
  loaded: boolean;
  setProfile: (p: {
    avatarUrl?: string | null;
    lastName?: string | null;
    country?: string | null;
    timezone?: string | null;
  }) => void;
  setCountry: (iso2: string) => void;
  setTimezone: (tz: string | null) => void;
  reset: () => void;
}

export const useProfileStore = create<ProfileState>((set) => ({
  avatarUrl: null,
  lastName: null,
  country: "US",
  timezone: null,
  loaded: false,
  setProfile: (p) =>
    set((s) => ({
      avatarUrl: p.avatarUrl !== undefined ? p.avatarUrl : s.avatarUrl,
      lastName: p.lastName !== undefined ? p.lastName : s.lastName,
      country: p.country !== undefined ? (p.country || "US") : s.country,
      timezone: p.timezone !== undefined ? p.timezone : s.timezone,
      loaded: true,
    })),
  setCountry: (iso2) =>
    set(() => ({ country: iso2 })),
  setTimezone: (tz) => set({ timezone: tz }),
  reset: () =>
    set({ avatarUrl: null, lastName: null, country: "US", timezone: null, loaded: false }),
}));
