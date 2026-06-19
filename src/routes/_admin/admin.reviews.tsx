import { Fragment, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute } from "@tanstack/react-router";
import { ChevronDown, ChevronRight, Pencil, Star, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  deleteAdminReview,
  listAdminReviews,
  type AdminReviewRow,
} from "@/lib/admin-reviews.functions";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { EditReviewDialog } from "@/components/admin/EditReviewDialog";

export const Route = createFileRoute("/_admin/admin/reviews")({
  component: ReviewsPage,
});

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      <div className="flex">
        {[1, 2, 3, 4, 5].map((n) => (
          <Star
            key={n}
            className={
              n <= rating
                ? "h-4 w-4 fill-amber-400 text-amber-400"
                : "h-4 w-4 text-muted-foreground/40"
            }
          />
        ))}
      </div>
      <span className="text-xs text-muted-foreground">({rating}/5)</span>
    </div>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function ReviewsTable() {
  const fetchReviews = useServerFn(listAdminReviews);
  const deleteReview = useServerFn(deleteAdminReview);
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "reviews"],
    queryFn: () => fetchReviews(),
  });

  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editing, setEditing] = useState<AdminReviewRow | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [deleting, setDeleting] = useState<AdminReviewRow | null>(null);

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteReview({ data: { id } }),
    onSuccess: () => {
      toast.success("Review deleted");
      setDeleting(null);
      void qc.invalidateQueries({ queryKey: ["admin", "reviews"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const rows = data ?? [];

  return (
    <TooltipProvider delayDuration={150}>
      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 text-left text-xs uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="w-8 px-2 py-2.5"></th>
              <th className="px-4 py-2.5">Date</th>
              <th className="px-4 py-2.5">Charter Title</th>
              <th className="px-4 py-2.5">Reviewed By</th>
              <th className="px-4 py-2.5">Review Title</th>
              <th className="px-4 py-2.5">Rating</th>
              <th className="px-4 py-2.5 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-6 text-center text-muted-foreground">
                  No reviews yet.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const isOpen = expanded.has(r.id);
              return (
                <Fragment key={r.id}>
                  <tr key={r.id} className="border-t">
                    <td className="px-2 py-3">
                      <button
                        type="button"
                        onClick={() => toggle(r.id)}
                        className="rounded p-1 hover:bg-muted"
                        aria-label={isOpen ? "Collapse" : "Expand"}
                      >
                        {isOpen ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {formatDate(r.created_at)}
                    </td>
                    <td className="px-4 py-3 font-medium">
                      {r.listing_slug && r.category_slug ? (
                        <a
                          href={`/c/${r.category_slug}/${r.listing_slug}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-foreground underline-offset-2 hover:underline"
                        >
                          {r.listing_title}
                        </a>
                      ) : (
                        r.listing_title
                      )}
                    </td>
                    <td className="px-4 py-3">{r.learner_display_name}</td>
                    <td className="px-4 py-3 max-w-[260px] truncate">{r.title}</td>
                    <td className="px-4 py-3">
                      <StarRow rating={r.rating} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                setEditing(r);
                                setEditOpen(true);
                              }}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Edit</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => setDeleting(r)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent>Delete</TooltipContent>
                        </Tooltip>
                      </div>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr key={`${r.id}-detail`} className="border-t bg-muted/20">
                      <td></td>
                      <td colSpan={6} className="px-4 py-3">
                        <div className="text-xs uppercase tracking-wide text-muted-foreground">
                          Full review
                        </div>
                        <p className="mt-1 whitespace-pre-wrap text-sm text-foreground">
                          {r.description}
                        </p>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <EditReviewDialog review={editing} open={editOpen} onOpenChange={setEditOpen} />

      <AlertDialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this review?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the review from the database. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                if (deleting) deleteMutation.mutate(deleting.id);
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting…" : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
}

function ReviewsPage() {
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Manage learner-submitted reviews across all listings.
      </p>
      <ReviewsTable />
    </div>
  );
}
