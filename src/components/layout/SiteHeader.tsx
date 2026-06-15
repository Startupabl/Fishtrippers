import { useState } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search } from "lucide-react";

import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { useAuthStore } from "@/stores/useAuthStore";
import { startNewMentorExpressListing } from "@/stores/useMentorExpressStore";
import { AlertsBellButton } from "./AlertsBellButton";
import { MessagesIconButton } from "./MessagesIconButton";
import { AlertsOnlyBellButton } from "./AlertsOnlyBellButton";
import { UserAvatarMenu } from "./UserAvatarMenu";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";
import { TagSuggestInput } from "@/components/search/TagSuggestInput";

export function SiteHeader() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const isAuthenticated = !!user;
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const { guard, dialog: profileGuardDialog } = useProfileGuard();

  if (pathname.startsWith("/checkout")) return null;

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim();
    setSearchQuery("");
    navigate({ to: "/search", search: q ? { q } : undefined } as never);
  };

  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-paper">
      <div className="mx-auto flex h-20 max-w-[1400px] items-center justify-between gap-6 px-4 sm:px-6 md:px-8 md:h-24">
        <div className="flex shrink-0 items-center gap-6">
          <Logo size="lg" showTagline />
        </div>

        <form
          onSubmit={handleSearchSubmit}
          className="relative hidden flex-1 lg:block lg:max-w-md"
        >
          <TagSuggestInput
            value={searchQuery}
            onChange={setSearchQuery}
            onSubmit={(v) => {
              setSearchQuery("");
              const q = v.trim();
              navigate({ to: "/search", search: q ? { q } : undefined } as never);
            }}
            placeholder="Search AI courses..."
            ariaLabel="Search AI courses"
            inputClassName={`h-11 w-full rounded-full border border-border bg-background pl-5 ${isHome ? "pr-12" : "pr-28"} text-base text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30`}
            inputStyle={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
            rightSlot={
              isHome ? (
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-1 top-1/2 inline-flex h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <Search className="size-5" />
                </button>
              ) : (
                <button
                  type="submit"
                  aria-label="Search"
                  className="absolute right-1 top-1/2 inline-flex h-9 -translate-y-1/2 items-center justify-center rounded-full px-5 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{
                    backgroundColor: DESIGN_SYSTEM.colors.accentGreen,
                    fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  }}
                >
                  Squeeze
                </button>
              )
            }
          />
        </form>

        <div className="flex items-center gap-2 lg:gap-3">

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
                className="hidden h-11 px-4 text-base font-semibold lg:inline-flex"
              >
                <Link to="/login">Sign In</Link>
              </Button>
              <Button
                asChild
                variant="info"
                className="hidden h-11 px-4 text-base font-semibold lg:inline-flex lg:px-5"
              >
                <Link to="/register">Sign Up</Link>
              </Button>
            </>
          )}
          <Button
            asChild
            className="hidden h-12 rounded-full border-2 bg-white px-6 text-base font-semibold shadow-sm hover:bg-white/90 sm:inline-flex sm:px-4 lg:px-7"
            style={{
              borderColor: DESIGN_SYSTEM.colors.accentGreen,
              color: DESIGN_SYSTEM.colors.accentGreen,
              fontFamily: DESIGN_SYSTEM.fonts.serif,
            }}
          >
            <Link
              to="/mentor/create-path"
              search={{ new: true }}
              onClick={guard(startNewMentorExpressListing)}
            >
              List Your AI Course
            </Link>
          </Button>
        </div>
      </div>
      {profileGuardDialog}
    </header>
  );
}
