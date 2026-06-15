import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Star } from "lucide-react";
import { getListingReviews } from "@/lib/reviews.functions";
import { cn } from "@/lib/utils";

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          className={cn(
            "size-4",
            n <= rating
              ? "fill-yellow-400 text-yellow-400"
              : "text-muted-foreground/40",
          )}
        />
      ))}
    </div>
  );
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "";
  }
}

export function ListingReviews({ listingId }: { listingId: string }) {
  const fetchFn = useServerFn(getListingReviews);
  const { data, isLoading } = useQuery({
    queryKey: ["listing-reviews", listingId],
    queryFn: () => fetchFn({ data: { listingId } }),
  });

  const reviews = data ?? [];
  const count = reviews.length;
  const avg =
    count > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / count : 0;

  // Hide the entire reviews box until the listing has at least one review.
  if (isLoading || count === 0) return null;

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <h2
          className="text-lg font-semibold text-foreground"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Reviews
        </h2>
        <div className="flex items-center gap-1 text-sm text-foreground">
          <Star className="size-4 fill-yellow-400 text-yellow-400" />
          <span className="font-semibold">{avg.toFixed(1)}</span>
          <span className="text-muted-foreground">({count})</span>
        </div>
      </div>

      <div className="mt-4 space-y-4">
        {reviews.map((r) => (
          <article key={r.id} className="border-t border-border pt-4 first:border-t-0 first:pt-0">
            <div className="flex items-center gap-2">
              <StarRow rating={r.rating} />
              <span className="text-sm font-semibold text-foreground">
                — {r.title}
              </span>
            </div>
            <p className="mt-2 text-sm text-foreground">"{r.description}"</p>
            <p className="mt-2 text-xs text-muted-foreground">
              — Posted by {r.learner_display_name} on {fmtDate(r.created_at)}
            </p>
          </article>
        ))}
      </div>
    </section>
  );
}
