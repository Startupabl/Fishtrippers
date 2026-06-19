import { useEffect, useState } from "react";
import { Outlet, Link, createFileRoute, redirect, useRouter, useRouterState } from "@tanstack/react-router";
import { LayoutDashboard, Users, ListChecks, Receipt, CalendarClock, Search, Star, Settings as SettingsIcon, ArrowLeft, Menu, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Logo } from "@/components/brand/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const OCEAN = "#0A2540";

export const Route = createFileRoute("/_admin")({
  beforeLoad: async () => {
    // Defer to client — SSR/prerender has no session and would falsely redirect.
    if (typeof window === "undefined") return;

    const { data: sessionData } = await supabase.auth.getSession();
    const session = sessionData.session;
    if (!session) {
      throw redirect({ to: "/login" });
    }

    try {
      const { data: isAdmin } = await supabase.rpc("has_role", {
        _user_id: session.user.id,
        _role: "admin",
      });
      if (!isAdmin) {
        throw redirect({ to: "/" });
      }
    } catch (e) {
      // Re-throw redirects; swallow transient network errors and let the page render.
      if (e && typeof e === "object" && "to" in (e as Record<string, unknown>)) throw e;
    }
  },
  component: AdminLayout,
});

const NAV = [
  { to: "/admin", label: "Overview", icon: LayoutDashboard, exact: true },
  { to: "/admin/users", label: "Users", icon: Users, exact: false },
  { to: "/admin/listings", label: "Listings", icon: ListChecks, exact: false },
  { to: "/admin/transactions", label: "Transactions", icon: Receipt, exact: false },
  { to: "/admin/availability", label: "Availability Manager", icon: CalendarClock, exact: false },
  { to: "/admin/search-seo", label: "Search & SEO", icon: Search, exact: false },
  { to: "/admin/reviews", label: "Reviews", icon: Star, exact: false },
  { to: "/admin/settings", label: "Settings", icon: SettingsIcon, exact: false },
] as const;

function pageTitle(pathname: string): string {
  if (pathname === "/admin") return "Overview";
  if (pathname.startsWith("/admin/users")) return "Users";
  if (pathname.startsWith("/admin/listings")) return "Listings";
  if (pathname.startsWith("/admin/transactions")) return "Transactions";
  if (pathname.startsWith("/admin/availability")) return "Calendar Availability & Hold Logs";
  if (pathname.startsWith("/admin/search-seo")) return "Search & SEO";
  if (pathname.startsWith("/admin/reviews")) return "Reviews";
  if (pathname.startsWith("/admin/settings")) return "Settings";
  return "Admin";
}


function AdminLayout() {
  const router = useRouter();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const isActive = (to: string, exact: boolean) =>
    exact ? pathname === to : pathname === to || pathname.startsWith(to + "/");

  // Do not render the admin shell during SSR — the role check is client-only,
  // so server-rendered HTML must not expose admin UI structure.
  if (!mounted) return null;

  return (
    <div className="flex min-h-screen bg-[#F7F8F5]">

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-[12.5rem] transform text-white transition-transform lg:static lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
        style={{ backgroundColor: OCEAN }}
      >
        <div className="flex items-center justify-between px-5 pb-4 pt-6">
          <Link to="/admin" className="inline-flex" aria-label="FishTrippers Admin">
            <span className="text-xl font-extrabold tracking-tight">
              <span style={{ color: "#E8B547" }}>Fish</span>
              <span className="text-white">Trippers</span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded p-1 text-white/80 hover:bg-white/10 lg:hidden"
            aria-label="Close menu"
          >
            <X className="size-5" />
          </button>
        </div>
        <nav className="mt-2 flex flex-col gap-1 px-3">
          {NAV.map(({ to, label, icon: Icon, exact }) => {
            const active = isActive(to, exact);
            return (
              <Link
                key={to}
                to={to}
                className={cn(
                  "group relative flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-white/15 text-white"
                    : "text-white/85 hover:bg-white/10 hover:text-white",
                )}
              >
                {active && <span className="absolute inset-y-1 left-0 w-1 rounded-r bg-white" />}
                <Icon className="size-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute inset-x-0 bottom-0 px-5 pb-5 text-xs text-white/70">
          Admin Mission Control
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/40 lg:hidden"
          aria-hidden
        />
      )}

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-20 flex h-14 items-center justify-between border-b bg-white px-4 lg:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="rounded p-1 text-foreground hover:bg-muted lg:hidden"
              aria-label="Open menu"
            >
              <Menu className="size-5" />
            </button>
            <h1 className="text-base font-semibold text-foreground">{pageTitle(pathname)}</h1>
            <span
              className="rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-white"
              style={{ backgroundColor: OCEAN }}
            >
              Admin
            </span>
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to="/">
              <ArrowLeft className="size-4" /> Back to Site
            </Link>
          </Button>
        </header>
        <main className="min-w-0 flex-1 p-4 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
