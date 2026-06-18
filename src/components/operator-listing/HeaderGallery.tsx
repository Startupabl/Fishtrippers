import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Camera, MapPin, Share2, ShieldCheck, Grid3x3 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { listMyOperatorPhotos, type OperatorPhoto } from "@/lib/operator-photos.functions";
import { GalleryManager } from "./GalleryManager";
import { LightboxModal } from "./LightboxModal";

interface Props {
  title: string;
  location: string;
  verified: boolean;
  /** When true, owner-only controls (Upload / Manage photos) are shown. */
  canManage?: boolean;
  /** Pre-fetched photos (public viewer path). When provided, internal owner-only query is skipped. */
  photos?: OperatorPhoto[];
  photosLoading?: boolean;
}

export function HeaderGallery({
  title,
  location,
  verified,
  canManage = true,
  photos: photosProp,
  photosLoading: photosLoadingProp,
}: Props) {
  const usingProp = photosProp !== undefined;
  const list = useServerFn(listMyOperatorPhotos);
  const { data: ownPhotos = [], isLoading: ownLoading } = useQuery({
    queryKey: ["operator-photos-mine"],
    queryFn: () => list(),
    enabled: canManage && !usingProp,
  });

  const [managerOpen, setManagerOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxStart, setLightboxStart] = useState(0);

  const photoList = (usingProp ? photosProp! : (ownPhotos as OperatorPhoto[])) as OperatorPhoto[];
  const isLoading = usingProp ? !!photosLoadingProp : (canManage && ownLoading);
  const hasPhotos = photoList.length > 0;
  const grid = photoList.slice(0, 5);

  const openLightbox = (i: number) => {
    setLightboxStart(i);
    setLightboxOpen(true);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {title || "Untitled listing"}
            </h1>
            {verified && (
              <span
                title="Verified"
                className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white"
              >
                <ShieldCheck className="h-4 w-4" />
              </span>
            )}
          </div>
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4" />
            <span>{location || "Location not set"}</span>
            <span aria-hidden>—</span>
            <a href="#map" className="text-primary underline-offset-2 hover:underline">
              Show map
            </a>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" aria-label="Share">
            <Share2 className="h-4 w-4" />
          </Button>
          {canManage && hasPhotos && (
            <Button variant="outline" onClick={() => setManagerOpen(true)}>
              <Camera className="mr-2 h-4 w-4" />
              Manage photos
            </Button>
          )}
          <Button asChild className="bg-gold text-ocean-deep hover:bg-gold-deep">
            <a href="#trips">Select your trip</a>
          </Button>
        </div>
      </div>

      {hasPhotos ? (
        <div className="relative grid h-[260px] grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl sm:h-[420px]">
          {/* Big hero tile (first photo) */}
          <button
            type="button"
            onClick={() => openLightbox(0)}
            className="col-span-4 row-span-2 sm:col-span-2 sm:row-span-2 overflow-hidden bg-muted"
          >
            <img
              src={grid[0].hero_url}
              alt=""
              loading="eager"
              className="h-full w-full object-cover transition hover:scale-[1.02]"
            />
          </button>
          {/* Up to 4 side tiles */}
          {[1, 2, 3, 4].map((i) => {
            const p = grid[i];
            if (!p) {
              return (
                <div
                  key={i}
                  className="hidden bg-muted sm:block"
                  aria-hidden
                />
              );
            }
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => openLightbox(i)}
                className="hidden overflow-hidden bg-muted sm:block"
              >
                <img
                  src={p.gallery_url}
                  alt=""
                  loading="lazy"
                  className="h-full w-full object-cover transition hover:scale-[1.02]"
                />
              </button>
            );
          })}

          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-3 right-3 shadow"
            onClick={() => openLightbox(0)}
          >
            <Grid3x3 className="mr-2 h-4 w-4" />
            Show all photos ({photoList.length})
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl border bg-muted/40 sm:h-[420px]">
          <div className="col-span-4 row-span-2 flex flex-col items-center justify-center gap-3 p-10 text-center sm:col-span-2">
            <div className="rounded-full bg-background p-4 shadow-sm">
              <Camera className="h-7 w-7 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold">No photos yet</h3>
            <p className="max-w-sm text-sm text-muted-foreground">
              Add boat photos and catch shots so guests can see what to expect.
            </p>
            {canManage && (
              <Button
                size="sm"
                variant="secondary"
                onClick={() => setManagerOpen(true)}
              >
                Upload Gallery Images
              </Button>
            )}
          </div>
          <div className="hidden sm:block sm:col-span-2 sm:row-span-2 bg-gradient-to-br from-muted to-muted/60" />
        </div>
      )}

      {canManage && (
        <GalleryManager open={managerOpen} onOpenChange={setManagerOpen} />
      )}
      <LightboxModal
        open={lightboxOpen}
        onOpenChange={setLightboxOpen}
        images={photoList}
        startIndex={lightboxStart}
      />
    </section>
  );
}
