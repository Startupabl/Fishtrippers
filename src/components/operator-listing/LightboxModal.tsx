import { useEffect, useState, useCallback } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, X } from "lucide-react";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  images: { hero_url: string }[];
  startIndex?: number;
}

export function LightboxModal({ open, onOpenChange, images, startIndex = 0 }: Props) {
  const [index, setIndex] = useState(startIndex);

  useEffect(() => {
    if (open) setIndex(startIndex);
  }, [open, startIndex]);

  const next = useCallback(
    () => setIndex((i) => (images.length ? (i + 1) % images.length : 0)),
    [images.length],
  );
  const prev = useCallback(
    () =>
      setIndex((i) =>
        images.length ? (i - 1 + images.length) % images.length : 0,
      ),
    [images.length],
  );

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
      else if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, next, prev, onOpenChange]);

  // Preload neighbors
  useEffect(() => {
    if (!open || images.length === 0) return;
    [(index + 1) % images.length, (index - 1 + images.length) % images.length].forEach(
      (i) => {
        const img = new Image();
        img.src = images[i].hero_url;
      },
    );
  }, [open, index, images]);

  if (images.length === 0) return null;
  const current = images[index];

  // Touch swipe
  let touchStartX: number | null = null;
  const onTouchStart = (e: React.TouchEvent) => {
    touchStartX = e.touches[0].clientX;
  };
  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX == null) return;
    const delta = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(delta) > 50) (delta < 0 ? next : prev)();
    touchStartX = null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="h-screen w-screen max-w-none rounded-none border-0 bg-black/95 p-0 sm:max-w-none [&>button]:hidden"
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        <div className="relative flex h-full w-full items-center justify-center">
          <img
            src={current.hero_url}
            alt=""
            className="max-h-[90vh] max-w-[95vw] object-contain"
          />

          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute left-4 top-1/2 -translate-y-1/2"
            onClick={prev}
            aria-label="Previous"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 top-1/2 -translate-y-1/2"
            onClick={next}
            aria-label="Next"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="absolute right-4 top-4"
            onClick={() => onOpenChange(false)}
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </Button>
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 rounded-full bg-black/60 px-3 py-1 text-sm text-white">
            {index + 1} / {images.length}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
