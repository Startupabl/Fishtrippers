import { useEffect } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Heart, Settings, LogOut, LayoutDashboard, Sprout, Globe, Check, ShieldCheck, GraduationCap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useHasActiveListing, useOperatorRoleLabel } from "@/hooks/useHasActiveListing";
import { useHasLearnerOrders } from "@/hooks/useHasLearnerOrders";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { SUPPORTED_CURRENCIES, getCurrencyMeta } from "@/lib/currency";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { startNewMentorExpressListing } from "@/stores/useMentorExpressStore";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";

function initialsFor(firstName?: string | null, lastName?: string | null, email?: string | null): string {
  const a = (firstName ?? "").trim();
  const b = (lastName ?? "").trim();
  if (a || b) return `${a[0] ?? ""}${b[0] ?? ""}`.toUpperCase() || (email?.[0] ?? "?").toUpperCase();
  return (email?.[0] ?? "?").toUpperCase();
}

export function UserAvatarMenu() {
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const hasListing = useHasActiveListing();
  const hasLearnerOrders = useHasLearnerOrders();
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const lastName = useProfileStore((s) => s.lastName);
  const setProfile = useProfileStore((s) => s.setProfile);
  const resetProfile = useProfileStore((s) => s.reset);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    supabase
      .from("profiles")
      .select("avatar_url, last_name")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return;
        setProfile({ avatarUrl: data?.avatar_url ?? null, lastName: data?.last_name ?? null });
      });
    return () => {
      cancelled = true;
    };
  }, [user, setProfile]);

  if (!user) return null;

  const handleLogout = async () => {
    resetProfile();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  const initials = initialsFor(user.firstName, lastName, user.email);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="rounded-full outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
      >
        <Avatar className="h-10 w-10 border-2 border-border">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.firstName} /> : null}
          <AvatarFallback
            className="text-sm font-semibold text-white"
            style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
          >
            {initials}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-60 overflow-hidden p-0"
        style={{ borderTop: `4px solid ${DESIGN_SYSTEM.colors.sunnyYellow}` }}
      >
        <div className="flex items-center gap-3 px-3 py-3">
          <Avatar className="h-11 w-11 shrink-0 border-2 border-border">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.firstName} /> : null}
            <AvatarFallback
              className="text-sm font-semibold text-white"
              style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
            >
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-foreground">
              {user.displayName?.trim() ? user.displayName : "AI Made Refreshing™"}
            </p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
          </div>
        </div>
        <DropdownMenuSeparator className="my-0" />
        <UserAvatarMenuItems
          hasListing={hasListing}
          hasLearnerOrders={hasLearnerOrders}
          onLogout={handleLogout}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserAvatarMenuItems({
  hasListing,
  hasLearnerOrders,
  onLogout,
}: {
  hasListing: boolean;
  hasLearnerOrders?: boolean;
  onLogout: () => void | Promise<void>;
}) {
  const isAdmin = useAuthStore((s) => s.user?.isAdmin ?? false);
  const { titleCase: roleLabel } = useOperatorRoleLabel();
  const { guard, dialog: profileGuardDialog } = useProfileGuard();
  return (
    <>
      {profileGuardDialog}
      {isAdmin && (
        <>
          <DropdownMenuItem asChild>
            <Link to="/admin" className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
              <ShieldCheck className="size-4" style={{ color: DESIGN_SYSTEM.colors.leafGreen }} />
              Admin Dashboard
            </Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
        </>
      )}

      {/* Section 1 — Personal */}
      <DropdownMenuLabel className="px-3 pb-1 pt-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Personal
      </DropdownMenuLabel>
      <DropdownMenuItem asChild>
        <Link to="/dashboard/favorites" className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
          <Heart className="size-4" /> Favorites
        </Link>
      </DropdownMenuItem>
      {hasLearnerOrders && (
        <DropdownMenuItem asChild>
          <Link to="/dashboard/learner" className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
            <GraduationCap className="size-4" /> My Trips Hub
          </Link>
        </DropdownMenuItem>
      )}

      {/* Section 2 — Operator Zone */}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {hasListing ? `${roleLabel} Zone` : "Earn"}
      </DropdownMenuLabel>
      {hasListing ? (
        <DropdownMenuItem asChild>
          <Link to="/dashboard" className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
            <LayoutDashboard className="size-4" style={{ color: DESIGN_SYSTEM.colors.leafGreen }} />
            {roleLabel} Dashboard
          </Link>
        </DropdownMenuItem>
      ) : (
        <DropdownMenuItem asChild>
          <Link
            to="/mentor/create-path"
            search={{ new: true }}
            onClick={guard(startNewMentorExpressListing)}
            className="flex w-full cursor-pointer items-center gap-2 px-3 py-2"
          >
            <Sprout className="size-4" style={{ color: DESIGN_SYSTEM.colors.leafGreen }} />
            Create a Listing
          </Link>
        </DropdownMenuItem>
      )}

      {/* Section 3 — Account */}
      <DropdownMenuSeparator />
      <DropdownMenuLabel className="px-3 pb-1 pt-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Account
      </DropdownMenuLabel>
      <CurrencySubMenu />
      <DropdownMenuItem asChild>
        <Link to="/settings/profile" className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
          <Settings className="size-4" /> Account Settings
        </Link>
      </DropdownMenuItem>
      <DropdownMenuItem
        onSelect={(e) => {
          e.preventDefault();
          void onLogout();
        }}
        className="flex cursor-pointer items-center gap-2 px-3 py-2 text-destructive focus:text-destructive"
      >
        <LogOut className="size-4" /> Log Out
      </DropdownMenuItem>
    </>
  );
}

function CurrencySubMenu() {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const current = getCurrencyMeta(currency);

  function handlePick(code: CurrencyCode) {
    if (code === currency) return;
    setCurrency(code);
    toast.success(`Showing prices in ${code}`);
  }

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger className="flex w-full cursor-pointer items-center gap-2 px-3 py-2">
        <Globe className="size-4" />
        Currency
        <DropdownMenuShortcut className="ml-auto opacity-100">
          <span aria-hidden className="mr-1">{current.flag}</span>
          {current.code}
        </DropdownMenuShortcut>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-48">
        {SUPPORTED_CURRENCIES.map((c) => (
          <DropdownMenuItem
            key={c.code}
            onSelect={() => handlePick(c.code)}
            className="min-h-10 cursor-pointer text-sm"
          >
            <span aria-hidden className="mr-2">{c.flag}</span>
            <span className="font-medium text-foreground">{c.code}</span>
            <span className="ml-2 text-muted-foreground">· {c.label}</span>
            {c.code === currency && <Check className="ml-auto size-4 text-foreground" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
