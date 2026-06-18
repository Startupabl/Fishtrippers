// Bridges Supabase auth state into the local useAuthStore. Mount once at root.
import { useEffect } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { installServerFnAuthFetch } from "@/integrations/supabase/server-fn-auth";
import { recordSessionIp } from "@/lib/session.functions";
import { useAuthStore, type AuthUser } from "@/stores/useAuthStore";
import { useMentorExpressStore } from "@/stores/useMentorExpressStore";
import { useMentorProfileStore } from "@/stores/useMentorProfileStore";
import { useOperatorOnboardingStore } from "@/stores/useOperatorOnboardingStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";


function toAuthUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): AuthUser | null {
  if (!user) return null;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  const firstName =
    (meta.first_name as string | undefined) ??
    (meta.given_name as string | undefined) ??
    (meta.name as string | undefined)?.split(" ")[0] ??
    "Friend";
  return {
    id: user.id,
    email: user.email ?? "",
    firstName,
    displayName: null,
    avatarUrl: null,
    role: null,
    onboardingComplete: false,
    isAdmin: false,
    isProfileComplete: null,
  };
}

async function hydrateProfileMeta(userId: string): Promise<{ isAdmin: boolean; isProfileComplete: boolean; displayName: string | null; avatarUrl: string | null; userStatus: string | null; timezone: string | null }> {
  const [adminRes, profileRes] = await Promise.all([
    supabase.rpc("has_role", { _user_id: userId, _role: "admin" }),
    supabase.from("profiles").select("is_profile_complete, display_name, avatar_url, user_status, timezone").eq("id", userId).maybeSingle(),
  ]);
  if (adminRes.error) console.error("[auth] has_role check failed", adminRes.error);
  return {
    isAdmin: Boolean(adminRes.data),
    isProfileComplete: Boolean(profileRes.data?.is_profile_complete),
    displayName: (profileRes.data as { display_name?: string | null } | null)?.display_name ?? null,
    avatarUrl: (profileRes.data as { avatar_url?: string | null } | null)?.avatar_url ?? null,
    userStatus: (profileRes.data as { user_status?: string | null } | null)?.user_status ?? null,
    timezone: (profileRes.data as { timezone?: string | null } | null)?.timezone ?? null,
  };
}

function detectBrowserTimezone(): string | null {
  if (typeof window === "undefined") return null;
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || null;
  } catch {
    return null;
  }
}

async function backfillTimezoneIfMissing(userId: string, current: string | null): Promise<string | null> {
  if (current && current.trim()) {
    useProfileStore.getState().setTimezone(current);
    return current;
  }
  const detected = detectBrowserTimezone();
  if (!detected) return null;
  try {
    const { error } = await supabase
      .from("profiles")
      .update({ timezone: detected })
      .eq("id", userId)
      .is("timezone", null);
    if (error) {
      console.error("[auth] timezone backfill failed", error);
      return null;
    }
    useProfileStore.getState().setTimezone(detected);
    return detected;
  } catch (e) {
    console.error("[auth] timezone backfill threw", e);
    return null;
  }
}

// Local-storage keys for per-user persisted Zustand stores. When the
// authenticated user changes (sign-in as a different account, or sign-out),
// these are purged so one user can never see another user's cached drafts,
// bios, photos, listings, bookings, etc.
const USER_SCOPED_STORAGE_KEYS = [
  "aimentor-mentor-express",
  "aimentor-mentor-profile",
  "aimentor-lesson-paths",
  "aimentor-bookings",
  "aimentor-chat",
  "aimentor-gift-cards-v1",
  "aimentor-earnings",
  "operator-onboarding-draft-v2",
];
const LAST_USER_KEY = "aimentor-last-user-id";

function purgeUserScopedStorage() {
  if (typeof window === "undefined") return;
  for (const key of USER_SCOPED_STORAGE_KEYS) {
    window.localStorage.removeItem(key);
  }
  // Also reset in-memory Zustand state so the previous user's draft can't
  // leak into the new user's session before a reload.
  useMentorExpressStore.getState().reset();
  useMentorProfileStore.getState().reset();
  useOperatorOnboardingStore.getState().reset();
}


function reconcileUserScopedStorage(currentUserId: string | null) {
  if (typeof window === "undefined") return;
  const last = window.localStorage.getItem(LAST_USER_KEY);
  if (last !== currentUserId) {
    purgeUserScopedStorage();
    if (currentUserId) {
      window.localStorage.setItem(LAST_USER_KEY, currentUserId);
    } else {
      window.localStorage.removeItem(LAST_USER_KEY);
    }
  }
}

export function useAuthListener() {
  const setUser = useAuthStore((s) => s.setUser);
  const setInitialized = useAuthStore((s) => s.setInitialized);

  useEffect(() => {
    installServerFnAuthFetch();

    async function applySession(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null) {
      reconcileUserScopedStorage(user?.id ?? null);
      const base = toAuthUser(user);
      if (!base) {
        setUser(null);
        useFavoritesStore.getState().reset();
        return;
      }
      const { isAdmin, isProfileComplete, displayName, avatarUrl, userStatus, timezone } = await hydrateProfileMeta(base.id);
      if (userStatus === "archived") {
        await supabase.auth.signOut();
        setUser(null);
        toast.error(
          "This account has been deactivated. Please contact support if you need assistance or require access to your historical records.",
        );
        return;
      }
      void backfillTimezoneIfMissing(base.id, timezone);
      setUser({ ...base, isAdmin, isProfileComplete, displayName, avatarUrl });
      void useFavoritesStore.getState().hydrate();
      try {
        await recordSessionIp();
      } catch (e) {
        if (e instanceof Error && e.message.includes("IP_BLOCKED")) {
          toast.error("This IP address has been blocked.");
          await supabase.auth.signOut();
          setUser(null);
        }
      }
    }

    // 1. Subscribe FIRST so we never miss an event.
    // Only react to identity transitions. TOKEN_REFRESHED (hourly + on tab
    // focus) and INITIAL_SESSION (every mount) must NOT re-run applySession,
    // or the user briefly flips to signed-out and back, causing protected
    // routes to bounce through /auth.
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "SIGNED_OUT" && event !== "USER_UPDATED") return;
      void applySession(session?.user ?? null);
    });
    // 2. Then hydrate.
    supabase.auth.getSession().then(async ({ data }) => {
      await applySession(data.session?.user ?? null);
      setInitialized(true);
    });
    return () => sub.subscription.unsubscribe();
  }, [setUser, setInitialized]);
}

