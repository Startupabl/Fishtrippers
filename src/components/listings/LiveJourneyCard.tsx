import { Link } from "@tanstack/react-router";
import { Star } from "lucide-react";

import { JourneyThumbnail } from "@/components/listings/JourneyThumbnail";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { AvatarLargePopover } from "@/components/profile/AvatarLargePopover";
import { FavoriteHeartButton } from "@/components/favorites/FavoriteHeartButton";
import { useFormattedPrice } from "@/lib/format-currency";
import { displayMentorName } from "@/lib/mentor-display";
import { listingLinkProps } from "@/lib/journeys.shared";
import type { CurrencyCode } from "@/stores/useCurrencyStore";
import type { JourneyRow } from "@/lib/journeys.functions";

function getMentorLabel(j: JourneyRow): string {
  if (j.mentor_display_name && j.mentor_display_name.trim().length > 0) {
    return j.mentor_display_name.trim();
  }
  const first = j.mentor_first_name?.trim() ?? "";
  const last = j.mentor_last_name?.trim() ?? "";
  const full = `${first} ${last}`.trim();
  if (full.length === 0) return "Aide";
  return displayMentorName(full);
}

function initials(label: string): string {
  return label
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function LiveJourneyCard({ journey }: { journey: JourneyRow }) {
  const price = useFormattedPrice(
    journey.base_price_minor,
    journey.currency as CurrencyCode,
  );
  const cover =
    journey.featured_image_url ||
    journey.cover_image_url ||
    `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(journey.title)}`;

  const mentorLabel = getMentorLabel(journey);


  return (
    <li className="relative flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-accent">
      <FavoriteHeartButton variant="card" journeyId={journey.id} />
      <Link
        {...listingLinkProps({ slug: journey.slug, category: journey.category })}
        className="block"
      >
        <div className="relative">
          <JourneyThumbnail
            src={cover}
            alt={journey.title}
            className="aspect-[16/9] w-full"
          />
        </div>
        <div className="p-4">
          <div className="flex min-h-[28px] items-center justify-between">
            <div className="flex items-center gap-2">
              <AvatarLargePopover
                displayName={mentorLabel}
                avatarUrl={journey.mentor_avatar_url ?? null}
                motto={journey.mentor_motto ?? null}
              >
                <Avatar className="size-7">
                  {journey.mentor_avatar_url ? (
                    <AvatarImage src={journey.mentor_avatar_url} alt={mentorLabel} />
                  ) : null}
                  <AvatarFallback className="text-[10px] font-semibold">
                    {initials(mentorLabel)}
                  </AvatarFallback>
                </Avatar>
              </AvatarLargePopover>
              <span className="truncate text-sm font-medium">
                <span className="text-gray-900">{mentorLabel}</span>
                <span className="text-accent"> - Aide</span>
              </span>
            </div>
            {(journey.review_count ?? 0) > 0 ? (
              <div className="flex items-center gap-1 text-sm font-normal text-gray-900">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span>{(journey.review_avg ?? 0).toFixed(1)}</span>
                <span className="text-gray-500">
                  ({journey.review_count} review{journey.review_count === 1 ? "" : "s"})
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-1 text-sm font-normal text-gray-700">
                <Star className="size-3.5 fill-amber-400 text-amber-400" />
                <span>Verified</span>
              </div>
            )}
          </div>
          {(journey.category || journey.experience_level) && (
            <p className="mt-1.5 text-xs font-normal text-gray-500">
              {[journey.category, journey.experience_level].filter(Boolean).join(" - ")}
            </p>
          )}
          <p
            className="mt-1 line-clamp-2 text-base font-bold text-gray-900"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            {journey.title}
          </p>
        </div>
      </Link>
      <div className="mt-auto flex items-center justify-end gap-1 px-4 pb-4">
        <span className="text-base font-bold text-accent">{price}</span>
        <span className="text-base font-bold text-accent">/ Person</span>
      </div>
    </li>
  );
}
