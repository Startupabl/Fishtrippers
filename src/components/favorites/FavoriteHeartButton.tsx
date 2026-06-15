import { useState, type MouseEvent } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";
import { useFavoritesStore } from "@/stores/useFavoritesStore";

interface FavoriteHeartButtonProps {
  journeyId: string;
  variant?: "card" | "row";
  className?: string;
  onRemoved?: () => void;
}

export function FavoriteHeartButton({
  journeyId,
  variant = "card",
  className,
  onRemoved,
}: FavoriteHeartButtonProps) {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isFav = useFavoritesStore((s) => s.ids.has(journeyId));
  const toggle = useFavoritesStore((s) => s.toggle);
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(false);

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (busy) return;

    if (!user) {
      toast.message("Sign in to save favorites");
      navigate({ to: "/login" });
      return;
    }

    setPop(true);
    window.setTimeout(() => setPop(false), 220);

    setBusy(true);
    try {
      const nowFav = await toggle(journeyId);
      if (!nowFav && onRemoved) onRemoved();
    } catch {
      toast.error("Couldn't update favorites. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  if (variant === "row") {
    return (
      <button
        type="button"
        onClick={handleClick}
        disabled={busy}
        aria-pressed={isFav}
        className={cn(
          "group inline-flex items-center gap-2 rounded-full text-sm font-medium transition-colors",
          "text-muted-foreground hover:text-destructive",
          isFav && "text-destructive",
          className,
        )}
      >
        <Heart
          className={cn(
            "size-5 transition-transform",
            pop && "scale-125",
            isFav ? "fill-destructive text-destructive" : "group-hover:fill-destructive/30",
          )}
          strokeWidth={2}
        />
        <span>{isFav ? "Remove from Favorites" : "Add to Favorites"}</span>
      </button>
    );
  }

  // variant === "card"
  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={busy}
      aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
      aria-pressed={isFav}
      className={cn(
        "group absolute right-2 top-2 z-10 inline-flex size-9 items-center justify-center rounded-full",
        "bg-background/90 backdrop-blur-sm shadow-sm ring-1 ring-border/60",
        "transition-colors hover:bg-background",
        className,
      )}
    >
      <Heart
        className={cn(
          "size-5 transition-transform duration-150",
          pop && "scale-125",
          isFav
            ? "fill-destructive text-destructive"
            : "text-muted-foreground group-hover:fill-destructive/40 group-hover:text-destructive",
        )}
        strokeWidth={2}
      />
    </button>
  );
}
