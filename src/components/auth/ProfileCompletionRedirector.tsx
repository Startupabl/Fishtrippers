import { useLayoutEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useAuthStore } from "@/stores/useAuthStore";

// Routes a signed-in user with an incomplete profile can stay on.
// Everything else immediately bounces to /settings/profile.
const ALLOWED_PREFIXES = [
  "/settings",
  "/login",
  "/register",
  "/logout",
  "/forgot-password",
  "/reset-password",
  "/onboarding",
  "/pages",
  "/privacy-policy",
  "/terms-of-service",
  "/security",
  "/trust-and-safety",
  "/acceptable-use-policy",
  "/data-handling",
  "/mentor-agreement",
  "/contact",
  "/about-us",
];

function isAllowed(pathname: string): boolean {
  // Allow `/` only when the learner-onboarding hand-off is in progress
  // (flagged in localStorage from /onboarding/choice).
  if (pathname === "/") {
    try {
      return localStorage.getItem("lemonaidely_quiz_open") === "1";
    } catch {
      return false;
    }
  }
  return ALLOWED_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
}

/**
 * Global interceptor: after sign-in/session hydrate, if `is_profile_complete`
 * is false and the user is anywhere outside an allowlisted route, send them
 * straight to /settings/profile before the destination view renders.
 */
export function ProfileCompletionRedirector() {
  const initialized = useAuthStore((s) => s.initialized);
  const user = useAuthStore((s) => s.user);
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();

  useLayoutEffect(() => {
    if (!initialized || !user) return;
    if (user.isProfileComplete !== false) return;
    if (isAllowed(pathname)) return;
    navigate({ to: "/settings/profile", replace: true });
  }, [initialized, user, pathname, navigate]);

  return null;
}


