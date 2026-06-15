import { Link } from "@tanstack/react-router";

import { useFormattedPrice } from "@/lib/format-currency";
import type { CurrencyCode } from "@/stores/useCurrencyStore";
import {
  getMentorBySlug,
  getJourneyThumbnail,
  type PathFixture,
} from "@/data/lesson-paths";
import {
  JourneyThumbnail,
  MentorAvatar,
} from "@/components/listings/JourneyThumbnail";
import { AvatarLargePopover } from "@/components/profile/AvatarLargePopover";
import { displayMentorName } from "@/lib/mentor-display";

interface ListingCardProps {
  path: PathFixture;
}

export function ListingCard({ path }: ListingCardProps) {
  const mentor = getMentorBySlug(path.mentorSlug);
  const price = useFormattedPrice(path.priceMinor, path.currency as CurrencyCode);

  return (
    <li className="flex flex-col overflow-hidden rounded-2xl border border-border bg-card transition-colors hover:bg-accent">
      <Link
        to="/c/$categorySlug/$listingSlug"
        params={{
          categorySlug: (path.category ?? "listings").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "listings",
          listingSlug: path.slug,
        }}
        className="block"
      >
        <div className="relative">
          <JourneyThumbnail
            src={getJourneyThumbnail(path)}
            alt={path.title}
            className="aspect-[16/9] w-full"
          />
          {mentor && (
            <div className="absolute bottom-3 right-3">
              <AvatarLargePopover
                displayName={displayMentorName(mentor.name)}
                avatarUrl={mentor.avatarUrl}
                motto={null}
              >
                <MentorAvatar
                  src={mentor.avatarUrl}
                  name={displayMentorName(mentor.name)}
                  className="size-10 rounded-full ring-2 ring-background shadow-md"
                />
              </AvatarLargePopover>
            </div>
          )}
        </div>

        <div className="p-4">
          {(path.category || path.experienceLevel) && (
            <p className="mt-1.5 text-xs font-normal text-gray-500">
              {[path.category, path.experienceLevel].filter(Boolean).join(" - ")}
            </p>
          )}
          <p
            className="mt-1 line-clamp-2 text-base font-bold text-gray-900"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            {path.title}
          </p>
        </div>
      </Link>

      <div className="mt-auto flex items-center justify-between gap-3 px-4 pb-4">
        {mentor ? (
          <Link
            to="/m/$mentorSlug"
            params={{ mentorSlug: mentor.slug }}
            className="min-w-0 leading-tight"
          >
            <span className="block text-[10px] uppercase tracking-wide text-muted-foreground">
              Aide
            </span>
            <span className="block truncate text-xs font-medium text-foreground hover:underline">
              {displayMentorName(mentor.name)}
            </span>
          </Link>
        ) : (
          <span />
        )}
        <div className="flex items-center justify-end gap-1">
          <span className="text-base font-bold text-accent">{price}</span>
          <span className="text-base font-bold text-accent">/ Person</span>
        </div>
      </div>
    </li>
  );
}
