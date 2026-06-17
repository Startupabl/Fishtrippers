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
              className="size-7 object-contain"
              loading="lazy"
            />
          ) : (
            <Sailboat className="size-6 text-foreground" />
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
          <Users className="size-5 text-foreground" />
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
          <Star className="size-5 fill-amber-400 text-amber-400" />
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

          {segments.length > 0 && (
            <div className="absolute inset-x-0 bottom-4 flex justify-center px-4">
              <div className="inline-flex w-[66%] min-w-[220px] max-w-[320px] items-stretch justify-around rounded-full bg-card/95 text-sm font-semibold text-foreground shadow-md backdrop-blur">
                {segments.map((seg, idx) => (
                  <div
                    key={seg.key}
                    className={`flex flex-1 items-center justify-center gap-2 px-3 py-2.5 ${
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

          )}
        </div>

        <div className="p-4">
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
