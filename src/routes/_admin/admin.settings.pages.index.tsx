import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Plus, Pencil, Trash2, ExternalLink } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { adminListPages, adminDeletePage } from "@/lib/site-pages.functions";

export const Route = createFileRoute("/_admin/admin/settings/pages/")({
  component: PagesSettings,
});

const CATEGORY_LABEL: Record<string, string> = {
  learning_teaching: "Learning & Teaching",
  support_safety: "Support & Safety",
  legal: "Legal",
};

type Category = "learning_teaching" | "support_safety" | "legal";
type Status = "live" | "draft";

interface PageRow {
  id: string;
  slug: string;
  title: string;
  category: Category;
  order_priority: number;
  is_external: boolean;
  external_url: string | null;
  status: Status;
  description: string | null;
  content_html: string | null;
}

function PagesSettings() {
  const qc = useQueryClient();
  const fetchPages = useServerFn(adminListPages);
  const del = useServerFn(adminDeletePage);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "site_pages"],
    queryFn: () => fetchPages(),
  });

  const [deleteTarget, setDeleteTarget] = useState<PageRow | null>(null);

  const deleteMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Page deleted");
      setDeleteTarget(null);
      qc.invalidateQueries({ queryKey: ["admin", "site_pages"] });
      qc.invalidateQueries({ queryKey: ["site_pages", "live"] });
    },
    onError: (e: Error) => toast.error(e.message ?? "Delete failed"),
  });

  const grouped = useMemo(() => {
    const list = (data ?? []) as PageRow[];
    return [...list].sort(
      (a, b) =>
        a.category.localeCompare(b.category) ||
        a.order_priority - b.order_priority ||
        a.title.localeCompare(b.title),
    );
  }, [data]);

  return (
    <div className="space-y-6">
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-semibold tracking-tight">Page Settings</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Manage informational pages and footer links. Live pages appear in the public footer.
          </p>
        </div>
        <Button asChild>
          <Link to="/admin/settings/pages/$pageId" params={{ pageId: "new" }}>
            <Plus className="size-4" /> Add New Page
          </Link>
        </Button>
      </div>

      <Card className="overflow-x-auto">
        {isLoading ? (
          <div className="p-6 text-sm text-muted-foreground">Loading…</div>
        ) : grouped.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No pages yet.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Slug</th>
                <th className="px-4 py-3 font-medium">Priority</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {grouped.map((row) => (
                <tr key={row.id}>
                  <td className="px-4 py-3 font-medium text-foreground">
                    {row.title}
                    {row.is_external && (
                      <span className="ml-2 text-xs text-muted-foreground">↗ external</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {CATEGORY_LABEL[row.category]}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{row.slug}</td>
                  <td className="px-4 py-3 text-muted-foreground">{row.order_priority}</td>
                  <td className="px-4 py-3">
                    <Badge variant={row.status === "live" ? "default" : "secondary"}>
                      {row.status === "live" ? "Live" : "Draft"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      asChild
                      className="text-muted-foreground hover:text-foreground"
                    >
                      <a
                        href={
                          row.is_external && row.external_url
                            ? row.external_url
                            : `/pages/${row.slug}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        title="View Live"
                      >
                        <ExternalLink className="size-4" />
                      </a>
                    </Button>
                    <Button variant="ghost" size="sm" asChild>
                      <Link
                        to="/admin/settings/pages/$pageId"
                        params={{ pageId: row.id }}
                        title="Edit"
                      >
                        <Pencil className="size-4" />
                      </Link>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteTarget(row)}
                      className="text-destructive hover:text-destructive"
                      title="Delete"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete page?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes "{deleteTarget?.title}". This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMut.mutate(deleteTarget.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
