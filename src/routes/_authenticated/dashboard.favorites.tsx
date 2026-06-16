import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { LiveJourneyCard } from "@/components/listings/LiveJourneyCard";
import { listMyFavoriteJourneys } from "@/lib/favorites.functions";
import { useFavoritesStore } from "@/stores/useFavoritesStore";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard/favorites")({
  head: () => ({ meta: [{ title: "Favorites — FishTrippers™" }] }),
  component: FavoritesPage,
});

function FavoritesPage() {
  const fetchFavorites = useServerFn(listMyFavoriteJourneys);
  const favoriteIds = useFavoritesStore((s) => s.ids);
  const { data, isLoading } = useQuery({
    queryKey: ["my-favorite-journeys"],
    queryFn: () => fetchFavorites(),
  });
  const [removing, setRemoving] = useState<Set<string>>(new Set());

  // Filter out locally-unfavorited rows so they disappear after the fade-out.
  const visible = useMemo(() => {
    return (data ?? []).filter((j) => favoriteIds.has(j.id) || removing.has(j.id));
  }, [data, favoriteIds, removing]);

  return (
    <main className="mx-auto max-w-[1400px] px-4 py-12 md:px-8">
      <h1 className="text-3xl font-bold tracking-tight">Favorites</h1>
      <p className="mt-2 text-muted-foreground">Save Courses and Aides you want to revisit.</p>

      {isLoading ? (
        <p className="mt-8 text-sm text-muted-foreground">Loading your favorites…</p>
      ) : visible.length === 0 ? (
        <Card className="mt-8 flex flex-col items-center gap-3 p-10 text-center">
          <Heart className="size-8 text-muted-foreground" />
          <p className="text-muted-foreground">
            No favorites yet. Tap the heart on any Course to save it here.
          </p>
          <Button asChild>
            <Link to="/search">Browse Courses</Link>
          </Button>
        </Card>
      ) : (
        <ul className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((j) => {
            const isRemoving = removing.has(j.id);
            return (
              <div
                key={j.id}
                className={cn(
                  "transition-opacity duration-300",
                  isRemoving && "pointer-events-none opacity-0",
                )}
                onTransitionEnd={() => {
                  if (isRemoving) {
                    setRemoving((prev) => {
                      const next = new Set(prev);
                      next.delete(j.id);
                      return next;
                    });
                  }
                }}
              >
                <LiveJourneyCard
                  journey={j}
                  // The heart inside the card updates the store; we mark this
                  // row as "removing" so it fades out before the filter drops it.
                />
                {/* Track removal via a hidden listener — when the store no
                    longer contains this id but the card is still rendered,
                    schedule a fade. */}
                <RemovalWatcher
                  journeyId={j.id}
                  onMarkRemoving={() =>
                    setRemoving((prev) => {
                      const next = new Set(prev);
                      next.add(j.id);
                      return next;
                    })
                  }
                />
              </div>
            );
          })}
        </ul>
      )}
    </main>
  );
}

function RemovalWatcher({
  journeyId,
  onMarkRemoving,
}: {
  journeyId: string;
  onMarkRemoving: () => void;
}) {
  const isFav = useFavoritesStore((s) => s.ids.has(journeyId));
  // When isFav flips false, trigger fade-out on the parent container.
  if (!isFav) {
    // Defer to avoid setState during render
    queueMicrotask(onMarkRemoving);
  }
  return null;
}
