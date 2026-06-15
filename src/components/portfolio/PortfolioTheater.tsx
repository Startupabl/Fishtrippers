// Theater / lightbox overlay — supports image + video assets, with prev/next.
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import type { PortfolioAsset } from "@/lib/journeys.functions";

interface Props {
  assets: PortfolioAsset[];
  startIndex: number;
  onClose: () => void;
}

function videoEmbedUrl(asset: PortfolioAsset): string | null {
  try {
    const u = new URL(asset.url);
    if (asset.provider === "youtube") {
      // youtube.com/watch?v=ID  or  youtu.be/ID
      let id = u.searchParams.get("v");
      if (!id && u.hostname.includes("youtu.be")) {
        id = u.pathname.slice(1);
      }
      return id ? `https://www.youtube.com/embed/${id}?autoplay=1` : asset.url;
    }
    if (asset.provider === "vimeo") {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}?autoplay=1` : asset.url;
    }
    return asset.url;
  } catch {
    return asset.url;
  }
}

export function PortfolioTheater({ assets, startIndex, onClose }: Props) {
  const [index, setIndex] = useState(startIndex);
  const total = assets.length;

  const goPrev = useCallback(
    () => setIndex((i) => (i - 1 + total) % total),
    [total],
  );
  const goNext = useCallback(() => setIndex((i) => (i + 1) % total), [total]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    }
    window.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [goPrev, goNext, onClose]);

  const asset = assets[index];
  if (!asset) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/95 p-4">
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
        aria-label="Close"
      >
        <X className="size-6" />
      </button>

      {total > 1 && (
        <>
          <button
            type="button"
            onClick={goPrev}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Previous"
          >
            <ChevronLeft className="size-6" />
          </button>
          <button
            type="button"
            onClick={goNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
            aria-label="Next"
          >
            <ChevronRight className="size-6" />
          </button>
        </>
      )}

      <div className="relative flex max-h-full max-w-5xl flex-col items-center gap-4">
        {asset.type === "image" ? (
          <img
            src={asset.url}
            alt={asset.caption || asset.title || ""}
            className="max-h-[80vh] max-w-full rounded-xl object-contain"
          />
        ) : (
          <div className="aspect-video w-[90vw] max-w-5xl">
            <iframe
              key={asset.id}
              src={videoEmbedUrl(asset) ?? asset.url}
              title={asset.title || "Video"}
              className="size-full rounded-xl"
              frameBorder="0"
              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        )}
        {asset.caption && (
          <p className="max-w-3xl text-center text-sm text-white/90">
            {asset.caption}
          </p>
        )}
        {total > 1 && (
          <p className="text-xs text-white/60">
            {index + 1} / {total}
          </p>
        )}
      </div>
    </div>
  );
}
