import { Link } from "@tanstack/react-router";
import { Sailboat, Users, ShieldCheck, MapPin, Zap, Star, Ship, Footprints, Sparkles } from "lucide-react";
import type { OperatorCardDTO } from "@/lib/operators-search.functions";

export function OperatorCard({ operator }: { operator: OperatorCardDTO }) {
  const businessSlug = operator.slug ?? operator.id;
  const location = operator.location_slug ?? "charters";
  const cityLabel = [operator.city, operator.state].filter(Boolean).join(", ");


  const segments: Array<{ key: string; content: React.ReactNode }> = [];

  if (operator.business_type === "guide") {
    segments.push({
      key: "guide",
      content: (
        <>
          <Footprints className="size-4 text-foreground" />
          <span>Guide</span>
        </>
      ),
    });
  } else if (operator.vessel_length_ft != null) {
    segments.push({
      key: "length",
      content: (
        <>
          <Sailboat className="size-4 text-foreground" />
          <span>{operator.vessel_length_ft} ft</span>
        </>
      ),
    });
  }

  if (operator.vessel_capacity != null) {
    segments.push({
      key: "capacity",
      content: (
        <>
          <Users className="size-4 text-foreground" />
          <span>{operator.vessel_capacity}</span>
        </>
      ),
    });
  }

  const reviewCount = operator.review_count ?? 0;
  if (reviewCount >= 1 && operator.rating != null) {
    segments.push({
      key: "rating",
      content: (
        <>
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <span>{operator.rating.toFixed(1)}</span>
          <span className="font-normal text-muted-foreground">
            ({reviewCount} review{reviewCount === 1 ? "" : "s"})
          </span>
        </>
      ),
    });
  } else if (operator.verified) {
    segments.push({
      key: "verified",
      content: (
        <>
          <Star className="size-4 fill-amber-400 text-amber-400" />
          <span>Verified</span>
        </>
      ),
    });
  }


  return (
    <li className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/charters/$location/$businessSlug"
        params={{ location, businessSlug }}
        className="block"
      >
        <div className="relative">
          <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
            {operator.cover_image_url ? (
              <img
                src={operator.cover_image_url}
                alt={operator.display_name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                loading="lazy"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm text-muted-foreground">
                No photo
              </div>
            )}
          </div>

          {segments.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 bottom-0 z-10 flex translate-y-1/2 justify-center px-4">
              <div className="pointer-events-auto flex w-[90%] items-stretch rounded-full border border-border/60 bg-card text-sm font-semibold text-foreground shadow-md">
                {segments.map((seg, idx) => (
                  <div
                    key={seg.key}
                    className={`flex flex-1 items-center justify-center gap-1.5 whitespace-nowrap px-2 py-2 ${
                      idx > 0 ? "border-l border-border/70" : ""
                    }`}
                  >
                    {seg.content}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-4 pt-8">
          <h3 className="flex items-center gap-1.5 text-base font-semibold text-foreground">
            <ShieldCheck className="size-4 text-info" aria-hidden />
            <span className="line-clamp-1">{operator.display_name}</span>
          </h3>

          {operator.trip_count > 0 && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <Ship className="size-3.5" />
              {operator.trip_count} Trip{operator.trip_count === 1 ? "" : "s"} Available
            </p>
          )}

          {cityLabel && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {cityLabel}
            </p>
          )}

          {operator.booking_type === "instant" && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
              <Zap className="size-3.5" />
              Instant Book
            </p>
          )}

          {operator.booking_type === "inquiry" && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-primary">
              <Sparkles className="size-3.5" />
              Bespoke Trip
            </p>
          )}

          <div className="mt-3 flex items-end justify-end gap-2">
            {operator.lowest_price_label ? (
              <span className="text-base font-bold text-emerald-700">
                {operator.lowest_price_label}
              </span>
            ) : (
              <span className="text-xs text-muted-foreground">Contact for pricing</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}

