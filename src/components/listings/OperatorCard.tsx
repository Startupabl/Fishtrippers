import { Link } from "@tanstack/react-router";
import { Sailboat, Users, ShieldCheck, MapPin, Zap } from "lucide-react";
import type { OperatorCardDTO } from "@/lib/operators-search.functions";

export function OperatorCard({ operator }: { operator: OperatorCardDTO }) {
  const categorySlug = operator.primary_environment ?? "listings";
  const listingSlug = operator.slug ?? operator.id;
  const cityLabel = [operator.city, operator.state].filter(Boolean).join(", ");

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

          {/* Bottom info pill row */}
          <div className="absolute inset-x-3 bottom-3 flex flex-wrap items-center gap-2">
            {operator.vessel_length_ft != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                <Sailboat className="size-3.5 text-muted-foreground" />
                {operator.vessel_length_ft} ft
              </span>
            )}
            {operator.vessel_capacity != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium text-foreground shadow-sm backdrop-blur">
                <Users className="size-3.5 text-muted-foreground" />
                {operator.vessel_capacity}
              </span>
            )}
            {operator.verified && (
              <span className="inline-flex items-center gap-1 rounded-full bg-card/95 px-2.5 py-1 text-xs font-medium text-emerald-700 shadow-sm backdrop-blur">
                <ShieldCheck className="size-3.5" />
                Verified
              </span>
            )}
          </div>
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
