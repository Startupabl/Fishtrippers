// Auth store — backed by Supabase. Hydrated by useAuthListener (in __root).
// UI predicates like the Logo's "locked while onboarding incomplete" still
// read from this store for backwards compatibility with existing components.

import { create } from "zustand";

export type UserRole = "learner" | "mentor";

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  displayName: string | null;
  avatarUrl: string | null;
  role: UserRole | null;
  onboardingComplete: boolean;
  isAdmin: boolean;
  isProfileComplete: boolean | null;
}

interface AuthState {
  user: AuthUser | null;
  currentView: UserRole | null;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setOnboardingComplete: (complete: boolean) => void;
  setProfileComplete: (complete: boolean) => void;
  setDisplayName: (displayName: string | null) => void;
  setAvatarUrl: (avatarUrl: string | null) => void;
  setCurrentView: (view: UserRole) => void;
  setInitialized: (v: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  currentView: null,
  initialized: false,
  setUser: (user) => set({ user, currentView: user?.role ?? null }),
  setOnboardingComplete: (complete) =>
    set((s) => ({
      user: s.user ? { ...s.user, onboardingComplete: complete } : null,
    })),
  setProfileComplete: (complete) =>
    set((s) => ({
      user: s.user ? { ...s.user, isProfileComplete: complete } : null,
    })),
  setDisplayName: (displayName) =>
    set((s) => ({
      user: s.user ? { ...s.user, displayName } : null,
    })),
  setAvatarUrl: (avatarUrl) =>
    set((s) => ({
      user: s.user ? { ...s.user, avatarUrl } : null,
    })),
  setCurrentView: (view) => set({ currentView: view }),
  setInitialized: (v) => set({ initialized: v }),
}));
