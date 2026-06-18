import { useState, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Hook + dialog for gating CTAs behind sign-in + profile completion.
 *
 *  - Guest (no session)      → "Sign in to continue" dialog → /register?redirect=...
 *  - Authenticated, incomplete → "Complete your profile" dialog → /settings/profile
 *  - Authenticated, complete   → runs the provided callback
 */
export function useProfileGuard() {
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const { isComplete, isLoading } = useProfileCompletion();
  const [mode, setMode] = useState<"closed" | "guest" | "incomplete">("closed");
  const navigate = useNavigate();

  const guard =
    (cb?: (e: MouseEvent) => void) =>
    (e: MouseEvent) => {
      // Guest → intercept and ask to sign in.
      if (initialized && !user) {
        e.preventDefault();
        e.stopPropagation();
        setMode("guest");
        return;
      }
      // Authenticated but profile incomplete.
      if (user && !isLoading && !isComplete) {
        e.preventDefault();
        e.stopPropagation();
        setMode("incomplete");
        return;
      }
      cb?.(e);
    };

  const open = mode !== "closed";
  const handleOpenChange = (next: boolean) => {
    if (!next) setMode("closed");
  };

  const currentHref =
    typeof window !== "undefined"
      ? window.location.pathname + window.location.search
      : "/";

  const dialog = (
    <AlertDialog open={open} onOpenChange={handleOpenChange}>
      <AlertDialogContent>
        {mode === "guest" ? (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>👋 Sign in to continue</AlertDialogTitle>
              <AlertDialogDescription>
                Create a free account (or log in) to message guides, check
                availability, and list your own fishing trips. It only takes a moment.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-2 sm:gap-0">
              <AlertDialogCancel>Not now</AlertDialogCancel>
              <button
                type="button"
                onClick={() => {
                  setMode("closed");
                  navigate({
                    to: "/login",
                    search: { redirect: currentHref } as never,
                  });
                }}
                className="inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium hover:bg-accent"
              >
                Log in
              </button>
              <AlertDialogAction
                onClick={() => {
                  setMode("closed");
                  navigate({
                    to: "/register",
                    search: { redirect: currentHref } as never,
                  });
                }}
              >
                Create account
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        ) : (
          <>
            <AlertDialogHeader>
              <AlertDialogTitle>🔒 Complete Your Profile First</AlertDialogTitle>
              <AlertDialogDescription>
                Before you can list a trip or book one, we need a few mandatory details
                (like your name, location & timezone<span className="text-destructive">*</span>, and
                photo) so your trip schedules and messages sync correctly.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  setMode("closed");
                  navigate({ to: "/settings/profile" });
                }}
              >
                ⚙️ Go to Account Settings
              </AlertDialogAction>
            </AlertDialogFooter>
          </>
        )}
      </AlertDialogContent>
    </AlertDialog>
  );

  return { guard, dialog, isComplete, isLoading };
}
