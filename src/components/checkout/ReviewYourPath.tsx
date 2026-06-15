import { Calendar, Clock, Check } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Separator } from "@/components/ui/separator";
import { DESIGN_SYSTEM } from "@/lib/brand";
import type { CheckoutSelection } from "@/stores/useCheckoutStore";
import { displayMentorName } from "@/lib/mentor-display";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

function formatLongDate(iso: string, tz: string) {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(d);
  const time = new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
    timeZone: tz,
  }).format(d);
  return { date, time };
}

export function ReviewYourPath({ selection }: { selection: CheckoutSelection }) {
  const { date, time } = formatLongDate(
    selection.sessionDateIso,
    selection.sessionTimezone,
  );
  const initials = selection.mentorName
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");

  return (
    <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8">
      <h2 className="text-2xl text-foreground" style={lora}>
        Review your Course
      </h2>

      <div className="mt-6 flex items-center gap-4">
        <Avatar className="size-14 rounded-2xl">
          <AvatarImage src={selection.mentorAvatarUrl} alt={displayMentorName(selection.mentorName)} />
          <AvatarFallback className="rounded-2xl">{initials}</AvatarFallback>
        </Avatar>
        <div>
          <div className="text-lg text-foreground" style={lora}>
            {displayMentorName(selection.mentorName)}
          </div>
          <div className="text-sm text-muted-foreground">Verified Aide · 4.9 ★</div>
        </div>
      </div>

      <Separator className="my-6" />

      <div>
        <div className="text-lg text-foreground" style={lora}>
          {selection.pathTitle}
        </div>
        <ul className="mt-3 space-y-2">
          {selection.highlights.slice(0, 3).map((h) => (
            <li key={h} className="flex items-start gap-2 text-sm text-foreground">
              <Check
                className="mt-0.5 size-4 shrink-0"
                style={{ color: DESIGN_SYSTEM.colors.accentGreen }}
              />
              <span>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      <Separator className="my-6" />

      <div className="space-y-2 text-sm">
        <div className="flex items-center gap-2 text-foreground">
          <Calendar className="size-4 text-muted-foreground" />
          <span>{date}</span>
        </div>
        <div className="flex items-center gap-2 text-foreground">
          <Clock className="size-4 text-muted-foreground" />
          <span>{time}</span>
        </div>
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Reschedule free up to 24h before your first session.
      </p>
    </Card>
  );
}
