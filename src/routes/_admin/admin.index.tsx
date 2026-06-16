import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { UserPlus, BookOpen, DollarSign, AlertCircle } from "lucide-react";
import { getAdminOverview } from "@/lib/admin.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const Route = createFileRoute("/_admin/admin/")({
  component: OverviewPage,
});

function fmtMoneyMinor(minor: number) {
  return `$${(minor / 100).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function StatCard({
  title,
  icon: Icon,
  total,
  rows,
  warn,
  manageTo,
  manageSearch,
  alertRows = false,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  total: string;
  rows: { label: string; value: string }[];
  warn?: boolean;
  manageTo?: "/admin/users" | "/admin/listings" | "/admin/queue" | "/admin/transactions";
  manageSearch?: { tab: "listings" | "inquiries" | "flags" };
  alertRows?: boolean;
}) {
  return (
    <Card className="rounded-xl bg-white shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 p-8 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <Icon className="size-5 text-muted-foreground" />
      </CardHeader>
      <CardContent className="p-8 pt-0">
        <div className="flex items-center gap-3">
          <span className="text-5xl font-bold tracking-tight">{total}</span>
          {warn && (
            <span className="inline-block size-2.5 rounded-full" style={{ backgroundColor: "#E8B547" }} />
          )}
        </div>
        <dl className="mt-5 space-y-2 text-sm">
          {rows.map((r) => {
            const isUrgent = alertRows && Number(r.value) > 0;
            return (
              <div key={r.label} className="flex justify-between">
                <dt className="text-muted-foreground">{r.label}</dt>
                <dd className={isUrgent ? "font-semibold text-red-600" : "font-medium text-foreground"}>
                  {r.value}
                </dd>
              </div>
            );
          })}
        </dl>
        {manageTo && (
          <div className="mt-5 border-t pt-3">
            <Link
              to={manageTo}
              search={manageSearch as never}
              className="text-xs font-semibold text-lime-500 hover:text-lime-400 hover:underline"
            >
              Manage →
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function OverviewPage() {
  const fetchOverview = useServerFn(getAdminOverview);
  const { data, isLoading, error } = useQuery({
    queryKey: ["admin", "overview"],
    queryFn: () => fetchOverview(),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Loading…</p>;
  if (error) return <p className="text-sm text-destructive">Failed to load overview.</p>;
  if (!data) return null;

  const queueTotal = data.queue.pendingListings + data.queue.pendingInquiries + data.queue.openFlags;

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">
          A snapshot of platform health. All data is live.
        </p>
      </div>
      <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
        <StatCard
          title="Registrations Pulse"
          icon={UserPlus}
          total={String(data.registrations.total)}
          rows={[
            { label: "Today", value: String(data.registrations.day) },
            { label: "Last 7 days", value: String(data.registrations.week) },
            { label: "Last 30 days", value: String(data.registrations.month) },
            {
              label: "Email / Google / Other",
              value: `${data.registrations.byProvider.email} / ${data.registrations.byProvider.google} / ${data.registrations.byProvider.other}`,
            },
          ]}
          manageTo="/admin/users"
        />
        <StatCard
          title="Listing Pulse"
          icon={BookOpen}
          total={String(data.listings.total)}
          rows={[
            { label: "New today", value: String(data.listings.day) },
            { label: "New this week", value: String(data.listings.week) },
            { label: "New this month", value: String(data.listings.month) },
          ]}
          manageTo="/admin/listings"
        />
        <StatCard
          title="Revenue Pulse"
          icon={DollarSign}
          total={fmtMoneyMinor(data.revenue.total)}
          rows={[
            { label: "Today", value: fmtMoneyMinor(data.revenue.day) },
            { label: "Last 7 days", value: fmtMoneyMinor(data.revenue.week) },
            { label: "Last 30 days", value: fmtMoneyMinor(data.revenue.month) },
          ]}
          manageTo="/admin/transactions"
        />
        <StatCard
          title="Action Queue"
          icon={AlertCircle}
          total={String(queueTotal)}
          warn={queueTotal > 0}
          rows={[
            { label: "New Listing Applications", value: String(data.queue.pendingListings) },
            { label: "Support tickets", value: String(data.queue.pendingInquiries) },
            { label: "Flagged content", value: String(data.queue.openFlags) },
          ]}
          manageTo="/admin/queue"
          manageSearch={{ tab: "inquiries" }}
          alertRows

        />
      </div>
    </div>
  );
}
