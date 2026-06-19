import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  Wallet,
  BookOpen,
  Receipt,
  Plus,
  Search,
  Ship,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useHasActiveListingStatus, useOperatorRoleLabel } from "@/hooks/useHasActiveListing";
import { useHasLearnerOrdersStatus } from "@/hooks/useHasLearnerOrders";

type Item = {
  title: string;
  to: string;
  hash?: string;
  search?: Record<string, unknown>;
  icon: React.ComponentType<{ className?: string }>;
  exact?: boolean;
};

const aideItems: Item[] = [
  { title: "Dashboard", to: "/dashboard", icon: LayoutDashboard, exact: true },
  { title: "My Schedule", to: "/dashboard/upcoming-sessions", icon: Calendar },
  { title: "My Earnings", to: "/dashboard/earnings", icon: Wallet },
  { title: "My Listing", to: "/dashboard/my-listing", icon: BookOpen },
  { title: "Manage Availability", to: "/dashboard/master-calendar", icon: CalendarDays },
];

const learnerItems: Item[] = [
  { title: "Dashboard Home", to: "/dashboard/learner", icon: LayoutDashboard, exact: true },
  { title: "My Bookings", to: "/dashboard/learner/bookings", icon: Ship },
  { title: "Purchase History", to: "/dashboard/learner/purchases", icon: Receipt },
];

const guestItems: Item[] = [
  { title: "Listing Details", to: "/create-listing/new", search: { new: true }, icon: Plus },
  { title: "Book a Trip", to: "/search", icon: Search },
];

export type WorkspaceMode = "aide" | "learner" | "both" | "none" | "loading";

export function useWorkspaceMode(): { mode: WorkspaceMode; title: string } {
  const { hasListing, isLoaded: listingLoaded } = useHasActiveListingStatus();
  const { hasOrders, isLoaded: ordersLoaded } = useHasLearnerOrdersStatus();
  const { titleCase: roleLabel } = useOperatorRoleLabel();

  if (!listingLoaded || !ordersLoaded) {
    return { mode: "loading", title: "Workspace" };
  }
  if (hasListing && hasOrders) return { mode: "both", title: "My Dashboard" };
  if (hasListing) return { mode: "aide", title: `${roleLabel} Workspace` };
  if (hasOrders) return { mode: "learner", title: "Angler Hub" };
  return { mode: "none", title: "Get Started" };
}

function useIsActive() {
  const pathname = useRouterState({ select: (r) => r.location.pathname });
  const hash = useRouterState({ select: (r) => r.location.hash });
  return (it: Item) => {
    if (it.exact) return pathname === it.to || pathname === it.to + "/";
    if (it.hash) return pathname === it.to && hash === it.hash;
    return pathname === it.to || pathname.startsWith(it.to + "/");
  };
}

function ItemsMenu({ items }: { items: Item[] }) {
  const isActive = useIsActive();
  const { isMobile, setOpenMobile } = useSidebar();
  const handleClick = () => {
    if (isMobile) setOpenMobile(false);
  };
  return (
    <SidebarMenu>
      {items.map((it) => {
        const linkProps: Record<string, unknown> = { to: it.to };
        if (it.hash) linkProps.hash = it.hash;
        if (it.search) linkProps.search = it.search;
        return (
          <SidebarMenuItem key={it.title}>
            <SidebarMenuButton asChild isActive={isActive(it)} tooltip={it.title}>
              <Link
                {...(linkProps as React.ComponentProps<typeof Link>)}
                onClick={handleClick}
                className="flex items-center gap-2"
              >
                <it.icon className="h-4 w-4" />
                <span>{it.title}</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );
}

export function WorkspaceSidebar() {
  const { mode, title } = useWorkspaceMode();
  const { titleCase: operatorLabel } = useOperatorRoleLabel();

  return (
    <Sidebar
      collapsible="icon"
      className="top-20 md:top-24 !h-[calc(100svh-5rem)] md:!h-[calc(100svh-6rem)]"
    >
      <SidebarContent className="overflow-y-auto">
        {mode === "loading" ? null : mode === "both" ? (
          <>
            <SidebarGroup>
              <SidebarGroupLabel>{operatorLabel} Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <ItemsMenu items={aideItems} />
              </SidebarGroupContent>
            </SidebarGroup>
            <SidebarGroup>
              <SidebarGroupLabel>Angler Hub</SidebarGroupLabel>
              <SidebarGroupContent>
                <ItemsMenu items={learnerItems} />
              </SidebarGroupContent>
            </SidebarGroup>
          </>
        ) : (
          <SidebarGroup>
            <SidebarGroupLabel>{title}</SidebarGroupLabel>
            <SidebarGroupContent>
              <ItemsMenu
                items={
                  mode === "aide"
                    ? aideItems
                    : mode === "learner"
                      ? learnerItems
                      : guestItems
                }
              />
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
