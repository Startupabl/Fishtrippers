import { Link } from "@tanstack/react-router";
import { Sailboat, Users, ShieldCheck, MapPin, Zap, Star } from "lucide-react";
import type { OperatorCardDTO } from "@/lib/operators-search.functions";

export function OperatorCard({ operator }: { operator: OperatorCardDTO }) {
  const categorySlug = operator.primary_environment ?? "listings";
  const listingSlug = operator.slug ?? operator.id;
  const cityLabel = [operator.city, operator.state].filter(Boolean).join(", ");

  const segments: Array<{ key: string; content: React.ReactNode }> = [];

  if (operator.vessel_length_ft != null) {
    segments.push({
      key: "length",
      content: (
        <>
          {operator.boat_type_icon_url ? (
            <img
              src={operator.boat_type_icon_url}
              alt={operator.boat_type_name ?? "Boat"}
              className="h-5 w-auto object-contain"
              loading="lazy"
            />
          ) : (
            <Sailboat className="h-5 w-5 text-foreground" />
          )}
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
          <Users className="h-5 w-5 text-foreground" />
          <span>{operator.vessel_capacity}</span>
        </>
      ),
    });
  }

  if (operator.verified) {
    segments.push({
      key: "verified",
      content: (
        <>
          <Star className="h-5 w-5 fill-amber-400 text-amber-400" />
          <span>Verified</span>
        </>
      ),
    });
  }

  return (
    <li className="group overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
      <Link
        to="/c/$categorySlug/$listingSlug"
        params={{ categorySlug, listingSlug }}
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

          {cityLabel && (
            <p className="mt-1.5 flex items-center gap-1.5 text-sm text-muted-foreground">
              <MapPin className="size-3.5" />
              {cityLabel}
            </p>
          )}

          {operator.booking_type === "instant" && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-emerald-700">
              <Zap className="size-3.5" />
              Instant Confirmation
            </p>
          )}

          <div className="mt-3 flex items-end justify-between gap-2">
            <span className="text-xs text-muted-foreground">Trips from</span>
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

