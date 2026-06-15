import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Link } from "@tanstack/react-router";
import { ArrowLeft, Download, Search } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { listNewsletterSubscribers } from "@/lib/admin.functions";

export const Route = createFileRoute("/_admin/admin/settings/newsletter")({
  component: NewsletterPage,
});

function toCSV(rows: { email: string; created_at: string }[]): string {
  const header = "email,signed_up_at\n";
  const body = rows
    .map((r) => `"${r.email.replace(/"/g, '""')}","${r.created_at}"`)
    .join("\n");
  return header + body;
}

function NewsletterPage() {
  const fetchSubs = useServerFn(listNewsletterSubscribers);
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "newsletter-subscribers"],
    queryFn: () => fetchSubs(),
  });
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = data ?? [];
    if (!q.trim()) return list;
    const needle = q.trim().toLowerCase();
    return list.filter((r) => r.email.toLowerCase().includes(needle));
  }, [data, q]);

  function handleExport() {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `newsletter-subscribers-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">Newsletter Signups</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          All emails collected from the footer signup form.
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative w-full sm:max-w-sm">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search by email…"
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-muted-foreground">
            {filtered.length} {filtered.length === 1 ? "subscriber" : "subscribers"}
          </span>
          <Button onClick={handleExport} disabled={filtered.length === 0} variant="outline">
            <Download className="size-4" /> Export CSV
          </Button>
        </div>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            {data && data.length === 0 ? "No newsletter signups yet." : "No matches."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Signed up</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
