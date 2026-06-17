import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { getLivePageBySlug } from "@/lib/site-pages.functions";

const SLUG = "how-bookings-work-for-guides";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function HowBookingsWorkDialog({ open, onOpenChange }: Props) {
  const fetchPage = useServerFn(getLivePageBySlug);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["site_page", SLUG],
    queryFn: () => fetchPage({ data: { slug: SLUG } }),
    enabled: open,
    staleTime: 5 * 60 * 1000,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {data?.title ?? "How Bookings Work"}
          </DialogTitle>
        </DialogHeader>

        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {isLoading && (
            <div className="space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
              <Skeleton className="h-4 w-2/3" />
            </div>
          )}
          {isError && (
            <p className="text-sm text-muted-foreground">
              We couldn&apos;t load this guide right now. Please try again in a moment.
            </p>
          )}
          {!isLoading && !isError && !data && (
            <p className="text-sm text-muted-foreground">
              This guide isn&apos;t available yet.
            </p>
          )}
          {data?.content_html && (
            <div
              className="prose prose-sm dark:prose-invert max-w-none [&_h2]:mt-5 [&_h2]:text-base [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_p]:my-2"
              dangerouslySetInnerHTML={{ __html: data.content_html }}
            />
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
