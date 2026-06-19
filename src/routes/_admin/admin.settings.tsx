import { createFileRoute, Link, Outlet, useRouterState } from "@tanstack/react-router";
import { Tags, Mail, ChevronRight, FileText } from "lucide-react";
import { Card } from "@/components/ui/card";

const GREEN = "#0A2540";

export const Route = createFileRoute("/_admin/admin/settings")({
  component: SettingsLayout,
});

const CARDS = [
  {
    to: "/admin/settings/categories",
    title: "Categories",
    desc: "Manage charter flavors and categories used across listings.",
    icon: Tags,
  },
  {
    to: "/admin/settings/pages",
    title: "Page Settings",
    desc: "Manage informational pages and the dynamic footer links.",
    icon: FileText,
  },
  {
    to: "/admin/settings/email-templates",
    title: "Platform Communications",
    desc: "Manage automated emails and short header bell alert copy.",
    icon: Mail,
  },
] as const;

function SettingsLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isIndex = pathname === "/admin/settings" || pathname === "/admin/settings/";

  if (!isIndex) return <Outlet />;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Global controls for the site. Each section configures a different surface area.
      </p>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {CARDS.map(({ to, title, desc, icon: Icon }) => (
          <Link key={to} to={to} className="group block">
            <Card className="flex h-full items-start gap-4 p-5 transition-shadow hover:shadow-md">
              <div
                className="flex size-11 shrink-0 items-center justify-center rounded-lg text-white"
                style={{ backgroundColor: GREEN }}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-semibold text-foreground">{title}</h3>
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
