import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { Search, Calendar, Briefcase, User } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
import { useHasActiveListing, useHasActiveListingStatus } from "@/hooks/useHasActiveListing";
import { useHasLearnerOrders, useHasLearnerOrdersStatus } from "@/hooks/useHasLearnerOrders";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { UserAvatarMenuItems } from "./UserAvatarMenu";

const ACTIVE_COLOR = DESIGN_SYSTEM.colors.leafGreen;
const INACTIVE_CLASS = "text-foreground/70";

function ActiveBar({ show }: { show: boolean }) {
  if (!show) return null;
  return (
    <span
      aria-hidden
      className="absolute inset-x-3 top-0 h-0.5 rounded-b"
      style={{ backgroundColor: ACTIVE_COLOR }}
    />
  );
}

function NavItem({
  to,
  label,
  icon,
  active,
  onClick,
}: {
  to?: string;
  label: string;
  icon: React.ReactNode;
  active: boolean;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const inner = (
    <>
      <ActiveBar show={active} />
      <span
        className={active ? "" : INACTIVE_CLASS}
        style={active ? { color: ACTIVE_COLOR } : undefined}
      >
        {icon}
      </span>
      <span
        className={`text-[12px] font-medium leading-none ${active ? "" : INACTIVE_CLASS}`}
        style={{
          fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
          color: active ? ACTIVE_COLOR : undefined,
        }}
      >
        {label}
      </span>
    </>
  );
  const className =
    "relative flex flex-1 flex-col items-center justify-center gap-1 py-2 transition-colors";
  if (onClick || !to) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {inner}
      </button>
    );
  }
  return (
    <Link to={to} className={className}>
      {inner}
    </Link>
  );
}

export function BottomNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const hasListing = useHasActiveListing();
  const { hasListing: hasListingChecked, isLoaded: listingLoaded } = useHasActiveListingStatus();
  const hasLearnerOrders = useHasLearnerOrders();
  const { hasOrders: hasOrdersChecked, isLoaded: ordersLoaded } = useHasLearnerOrdersStatus();
  const avatarUrl = useProfileStore((s) => s.avatarUrl);
  const lastName = useProfileStore((s) => s.lastName);
  const resetProfile = useProfileStore((s) => s.reset);

  if (pathname.startsWith("/checkout")) return null;

  const isActive = (prefix: string) =>
    prefix === "/" ? pathname === "/" : pathname === prefix || pathname.startsWith(`${prefix}/`);

  const accountActive =
    isActive("/settings") ||
    (isActive("/dashboard") &&
      !isActive("/dashboard/my-orders") &&
      !isActive("/dashboard/aide"));

  const initials =
    ((user?.firstName?.[0] ?? "") + (lastName?.[0] ?? "")).toUpperCase() ||
    (user?.email?.[0] ?? "?").toUpperCase();

  const handleLogout = async () => {
    resetProfile();
    await supabase.auth.signOut();
    navigate({ to: "/" });
  };

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-paper shadow-[0_-2px_8px_rgba(0,0,0,0.04)] lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <div className="mx-auto flex max-w-2xl items-stretch px-2">
        <NavItem
          to="/search"
          label="Search"
          icon={<Search className="size-5" />}
          active={isActive("/search")}
        />
        <NavItem
          label="Orders"
          icon={<Calendar className="size-5" />}
          active={isActive("/dashboard/my-orders") || isActive("/my-learning")}
          onClick={() => {
            if (!user) {
              navigate({ to: "/login" });
              return;
            }
            if (ordersLoaded && !hasOrdersChecked) {
              navigate({ to: "/search", search: { empty: true } as never });
              return;
            }
            navigate({ to: "/my-learning" });
          }}
        />
        <NavItem
          label="Listings"
          icon={<Briefcase className="size-5" />}
          active={isActive("/dashboard/aide")}
          onClick={() => {
            if (!user) {
              navigate({ to: "/login" });
              return;
            }
            if (listingLoaded && !hasListingChecked) {
              navigate({ to: "/create-listing/new", search: { empty: true } as never });
              return;
            }
            navigate({ to: "/dashboard/aide" });
          }}
        />
        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label="Open account menu"
              className="relative flex flex-1 flex-col items-center justify-center gap-1 py-2 outline-none"
            >
              <ActiveBar show={accountActive} />
              <Avatar
                className="h-7 w-7 border"
                style={{
                  borderColor: accountActive ? ACTIVE_COLOR : undefined,
                  borderWidth: accountActive ? 2 : 1,
                }}
              >
                {avatarUrl ? <AvatarImage src={avatarUrl} alt={user.firstName} /> : null}
                <AvatarFallback
                  className="text-[10px] font-semibold text-white"
                  style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
                >
                  {initials}
                </AvatarFallback>
              </Avatar>
              <span
                className={`text-[12px] font-medium leading-none ${accountActive ? "" : INACTIVE_CLASS}`}
                style={{
                  fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                  color: accountActive ? ACTIVE_COLOR : undefined,
                }}
              >
                Account
              </span>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={8}
              className="w-60 overflow-hidden p-0"
              style={{ borderTop: `4px solid ${DESIGN_SYSTEM.colors.sunnyYellow}` }}
            >
              <UserAvatarMenuItems hasListing={hasListing} hasLearnerOrders={hasLearnerOrders} onLogout={handleLogout} />
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <NavItem
            to="/login"
            label="Account"
            icon={<User className="size-5" />}
            active={isActive("/login")}
          />
        )}
      </div>
    </nav>
  );
}
