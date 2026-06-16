import { CalendarPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { DESIGN_SYSTEM } from "@/lib/brand";
import {
  buildGoogleCalendarUrl,
  buildOutlookCalendarUrl,
} from "@/lib/calendar-links";
import type { Booking } from "@/stores/useBookingsStore";
import { displayMentorName } from "@/lib/mentor-display";

export function AddToCalendarMenu({
  booking,
  durationMinutes,
}: {
  booking: Booking;
  durationMinutes?: number;
}) {
  const startIso = booking.sessionDateIso;
  const endIso = durationMinutes
    ? new Date(
        new Date(startIso).getTime() + durationMinutes * 60_000,
      ).toISOString()
    : undefined;
  const event = {
    title: `${booking.pathTitle} with ${displayMentorName(booking.mentorName)}`,
    details: `Your FishTrippers lesson. Enter the classroom: ${typeof window !== "undefined" ? window.location.origin : ""}/classroom/${booking.sessionId}`,
    startIso,
    endIso,
  };
  const googleUrl = buildGoogleCalendarUrl(event);
  const outlookUrl = buildOutlookCalendarUrl(event);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          className="min-h-12 rounded-2xl text-white"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.accentGreen }}
        >
          <CalendarPlus className="mr-2 size-4" />
          Add to Calendar
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-56 rounded-2xl p-2">
        <a
          href={googleUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent"
        >
          Google Calendar
        </a>
        <a
          href={outlookUrl}
          target="_blank"
          rel="noreferrer"
          className="block rounded-xl px-3 py-2 text-sm text-foreground hover:bg-accent"
        >
          Outlook
        </a>
      </PopoverContent>
    </Popover>
  );
}
