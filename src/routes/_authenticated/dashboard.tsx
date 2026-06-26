import { useEffect } from "react";
import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
  useNavigate,
} from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import {
  BookOpen,
  CalendarDays,
  Calendar,
  FileText,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { ListingLiveCelebrationDialog } from "@/components/dashboard/ListingLiveCelebrationDialog";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";
import { useAuthStore } from "@/stores/useAuthStore";
import { useHasActiveListing, useOperatorRoleLabel } from "@/hooks/useHasActiveListing";
import { getMyStripeIds } from "@/lib/payouts.functions";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { WorkspaceSidebar, useWorkspaceMode } from "@/components/dashboard/WorkspaceSidebar";
import { SiteFooter } from "@/components/layout/SiteFooter";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Hub — FishTrippers" },
      { name: "description", content: "Manage your Trips, availability, and earnings." },
    ],
  }),
  component: DashboardLayout,
});

function DashboardLayout() {
  const { pathname } = useLocation();
  const isLearner =
    pathname === "/dashboard/learner" || pathname.startsWith("/dashboard/learner/");
  const atAideRoot = pathname === "/dashboard" || pathname === "/dashboard/";

  return (
    <SidebarProvider>
      <div className="flex min-h-screen min-w-0 w-full max-w-full overflow-x-hidden bg-paper">
        <WorkspaceSidebar />
        <div className="flex min-w-0 max-w-full flex-1 flex-col overflow-x-hidden">
          <DashboardHeaderBar />
          <main className="min-w-0 max-w-full flex-1 overflow-x-hidden">
            {isLearner ? <Outlet /> : atAideRoot ? <AideDashboardHome /> : <Outlet />}
          </main>
          <SiteFooter />
        </div>
      </div>
    </SidebarProvider>
  );
}

function DashboardHeaderBar() {
  const { title } = useWorkspaceMode();
  return (
    <div className="flex items-center gap-2 border-b border-border/60 bg-card/60 px-4 md:px-6 lg:px-8 py-2 backdrop-blur">
      <SidebarTrigger />
      <span className="text-sm font-medium text-muted-foreground">{title}</span>
    </div>
  );
}

function AideDashboardHome() {
  const navigate = useNavigate();
  const { dialog: profileGuardDialog } = useProfileGuard();
  const user = useAuthStore((s) => s.user);
  const hasListing = useHasActiveListing();
  const { titleCase: roleLabel } = useOperatorRoleLabel();
  const fetchIds = useServerFn(getMyStripeIds);
  const { data: stripeIds } = useQuery({
    queryKey: ["my-stripe-ids", user?.id],
    enabled: !!user && hasListing,
    queryFn: () => fetchIds(),
  });

  // Guard: non-aides shouldn't see the Aide workspace home.
  useEffect(() => {
    if (user && !hasListing) {
      navigate({ to: "/", replace: true });
    }
  }, [user, hasListing, navigate]);

  if (!user) return null;

  // Stripe payout banner intentionally suppressed — payments temporarily disabled.
  void stripeIds;

  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      {profileGuardDialog}
      <ListingLiveCelebrationDialog />

      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
            {roleLabel}'s Hub
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your hub for managing your listing, schedule, and earnings.
          </p>
        </div>
      </div>

      {/* All dashboard cards in one grid */}
      <section className="mt-8">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NavCard
            to="/dashboard/my-listing"
            icon={<BookOpen className="size-5" />}
            title="My Listing & Trips"
            desc="View, edit, and manage your listing and trips."
            tint="#e5e7eb33"
          />
          <NavCard
            to="/dashboard/verifications"
            icon={<ShieldCheck className="size-5" />}
            title="My Verifications"
            desc="Upload your identity, license, and vessel documents."
            tint="#e5e7eb33"
          />
          <NavCard
            to="/dashboard/master-calendar"
            icon={<CalendarDays className="size-5" />}
            title="My Availability"
            desc="Set your weekly availability and block-out dates."
            tint="#e5e7eb33"
          />
          <NavCard
            to="/dashboard/upcoming-sessions"
            icon={<Calendar className="size-5" />}
            title="My Schedule"
            desc="Track your scheduled fishing trips."
            tint="#e5e7eb33"
          />
          <NavCard
            to="/dashboard/manage-policies"
            icon={<FileText className="size-5" />}
            title="My Policies"
            desc="Set cancellation and booking policies."
            tint="#e5e7eb33"
          />
          <NavCard
            to="/dashboard/earnings"
            icon={<Wallet className="size-5" />}
            title="My Earnings"
            desc="Review your revenue ledger and receipts."
            tint="#e5e7eb33"
          />
        </div>
      </section>

    </div>
  );
}

function NavCard({
  to,
  hash,
  icon,
  title,
  desc,
  tint,
}: {
  to: string;
  hash?: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <Link to={to} hash={hash} className="block">
      <Card className="rounded-2xl border-border/60 p-5 transition-shadow hover:shadow-md">
        <div className="flex items-center gap-3">
          <div
            className="flex size-11 items-center justify-center rounded-xl"
            style={{ backgroundColor: tint }}
          >
            {icon}
          </div>
          <div>
            <p className="text-base font-semibold text-foreground" style={lora}>
              {title}
            </p>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
