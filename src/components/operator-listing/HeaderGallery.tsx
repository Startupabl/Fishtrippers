import { Camera, MapPin, Share2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  title: string;
  location: string;
  verified: boolean;
}

export function HeaderGallery({ title, location, verified }: Props) {
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
          <Button asChild className="bg-amber-500 text-black hover:bg-amber-600">
            <a href="#trips">Select your trip</a>
          </Button>
        </div>
      </div>

      {/* Gallery — empty state */}
      <div className="grid grid-cols-4 grid-rows-2 gap-2 overflow-hidden rounded-2xl border bg-muted/40 sm:h-[420px]">
        <div className="col-span-4 row-span-2 flex flex-col items-center justify-center gap-3 p-10 text-center sm:col-span-2">
          <div className="rounded-full bg-background p-4 shadow-sm">
            <Camera className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold">No photos yet</h3>
          <p className="max-w-sm text-sm text-muted-foreground">
            Add boat photos and catch shots so guests can see what to expect.
          </p>
          <Button size="sm" variant="secondary">
            Upload Gallery Images
          </Button>
        </div>
        <div className="hidden sm:block sm:col-span-2 sm:row-span-2 bg-gradient-to-br from-muted to-muted/60" />
      </div>
    </section>
  );
}
