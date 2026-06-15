import { Link, useNavigate, useRouterState } from "@tanstack/react-router";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { startNewMentorExpressListing } from "@/stores/useMentorExpressStore";
import { AlertsBellButton } from "./AlertsBellButton";
import { MessagesIconButton } from "./MessagesIconButton";
import { AlertsOnlyBellButton } from "./AlertsOnlyBellButton";
import { UserAvatarMenu } from "./UserAvatarMenu";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const _navigate = useNavigate();
  void _navigate;
  const { guard, dialog: profileGuardDialog } = useProfileGuard();

  if (pathname.startsWith("/checkout")) return null;

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-white">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 md:px-8 md:h-24">
        <div className="flex shrink-0 items-center gap-6">
          <Logo size="lg" />
        </div>

        <div className="flex items-center gap-2 lg:gap-3">
          <Button
            asChild
            className="hidden h-11 rounded-full bg-gold px-5 text-base font-bold text-ocean-deep shadow-sm hover:bg-gold-deep sm:inline-flex lg:px-6"
          >
            <Link
              to="/mentor/create-path"
              search={{ new: true }}
              onClick={guard(startNewMentorExpressListing)}
            >
              List Your Trip
            </Link>
          </Button>

          {isAuthenticated ? (
            <>
              <div className="hidden sm:block">
                <MessagesIconButton />
              </div>
              <div className="sm:hidden">
                <AlertsBellButton />
              </div>
              <div className="hidden sm:block">
                <AlertsOnlyBellButton />
              </div>
              <div className="hidden lg:block">
                <UserAvatarMenu />
              </div>
            </>
          ) : (
            <>
              <Button
                asChild
                variant="ghost"
                className="hidden h-11 px-4 text-base font-semibold text-ocean-deep lg:inline-flex"
              >
                <Link to="/login">Log in</Link>
              </Button>
              <Button
                asChild
                className="hidden h-11 px-4 text-base font-semibold text-ocean-deep lg:inline-flex lg:px-5"
                variant="ghost"
              >
                <Link to="/register">Sign up</Link>
              </Button>
            </>
          )}
        </div>
      </div>
      {profileGuardDialog}
    </header>
  );
}
