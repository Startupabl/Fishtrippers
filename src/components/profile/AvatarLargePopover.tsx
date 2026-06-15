import { ReactNode } from "react";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AvatarLargePopoverProps {
  displayName: string | null | undefined;
  avatarUrl: string | null | undefined;
  motto?: string | null;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

function initialsOf(name: string | null | undefined): string {
  if (!name) return "?";
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

/**
 * Hover popover for small/tiny avatars (search cards, messaging UI).
 * Shows an enlarged photo + bold display name, plus an italic motto
 * underneath when one is provided. Always renders the popover.
 */
export function AvatarLargePopover({
  displayName,
  avatarUrl,
  motto,
  children,
  side = "bottom",
}: AvatarLargePopoverProps) {
  const name = displayName?.trim() || null;
  const tag = motto?.trim() || null;

  return (
    <HoverCard openDelay={150} closeDelay={100}>
      <HoverCardTrigger asChild>
        <span className="inline-flex">{children}</span>
      </HoverCardTrigger>
      <HoverCardContent
        side={side}
        className="w-auto max-w-[18rem] p-4"
        align="center"
      >
        <div className="flex flex-col items-center text-center">
          <Avatar className="size-24">
            {avatarUrl ? <AvatarImage src={avatarUrl} alt={name ?? "Profile"} /> : null}
            <AvatarFallback className="text-lg font-semibold">
              {initialsOf(name)}
            </AvatarFallback>
          </Avatar>
          {name ? (
            <p className="mt-3 text-sm font-semibold leading-tight text-foreground">
              {name}
            </p>
          ) : null}
          {tag ? (
            <p className="mt-1 break-words text-xs italic leading-snug text-muted-foreground">
              {tag}
            </p>
          ) : null}
        </div>
      </HoverCardContent>
    </HoverCard>
  );
}
