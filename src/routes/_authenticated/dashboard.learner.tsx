import {
  createFileRoute,
  Link,
  Outlet,
  useLocation,
} from "@tanstack/react-router";
import { Calendar, Receipt, Ship } from "lucide-react";
import { Card } from "@/components/ui/card";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;

export const Route = createFileRoute("/_authenticated/dashboard/learner")({
  head: () => ({ meta: [{ title: "My Trips Hub — FishTrippers" }] }),
  component: LearnerWorkspace,
});

function LearnerWorkspace() {
  const { pathname } = useLocation();
  const atRoot =
    pathname === "/dashboard/learner" || pathname === "/dashboard/learner/";
  return atRoot ? <LearnerHome /> : <Outlet />;
}

function LearnerHome() {
  return (
    <div className="mx-auto w-full max-w-[1600px] px-4 md:px-6 lg:px-8 py-8 md:py-12">
      <div>
        <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
          My Trips Hub
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your scheduled sessions and your full purchase history — all in one place.
        </p>
      </div>

      <section className="mt-10">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <NavCard
            to="/dashboard/learner/schedule"
            icon={<Calendar className="size-5" />}
            title="My Schedule"
            desc="Your enrolled and completed sessions — chronological."
            tint={`${YELLOW}33`}
          />
          <NavCard
            to="/dashboard/learner/purchases"
            icon={<Receipt className="size-5" />}
            title="Purchase History"
            desc="Every booking, receipt, and amount paid."
            tint={`${LEAF}33`}
          />
        </div>
      </section>
    </div>
  );
}

function NavCard({
  to,
  icon,
  title,
  desc,
  tint,
}: {
  to: string;
  icon: React.ReactNode;
  title: string;
  desc: string;
  tint: string;
}) {
  return (
    <Link to={to} className="block">
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
