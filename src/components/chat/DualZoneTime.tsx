import { formatUtcInZone, tzAbbrev } from "@/lib/tz";

interface Props {
  utcIso: string;
  viewerTz: string;
  otherTz?: string | null;
  viewerLabel?: string;
  otherLabel?: string;
  durationMinutes?: number;
  compact?: boolean;
}

const FMT: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
  hour: "numeric",
  minute: "2-digit",
};

const END_FMT: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

/**
 * Renders a UTC timestamp in two IANA zones side-by-side (viewer + sender),
 * clearly labeled. Collapses to one row when zones match or otherTz is absent.
 * When `durationMinutes` is set, renders a "start – end" range and appends a
 * "· N min" suffix so users see both the time block and the total length.
 */
export function DualZoneTime({
  utcIso,
  viewerTz,
  otherTz,
  viewerLabel = "Your time",
  otherLabel = "Their time",
  durationMinutes,
  compact = false,
}: Props) {
  const when = new Date(utcIso);
  const showBoth = !!otherTz && otherTz !== viewerTz;

  const endIso = durationMinutes
    ? new Date(when.getTime() + durationMinutes * 60_000).toISOString()
    : null;

  const viewerStart = `${formatUtcInZone(utcIso, viewerTz, FMT)} ${tzAbbrev(viewerTz, when)}`;
  const viewerEnd = endIso ? formatUtcInZone(endIso, viewerTz, END_FMT) : null;
  const viewerText = viewerEnd ? `${viewerStart} – ${viewerEnd}` : viewerStart;

  const otherStart = showBoth
    ? `${formatUtcInZone(utcIso, otherTz!, FMT)} ${tzAbbrev(otherTz!, when)}`
    : null;
  const otherEnd =
    otherStart && endIso ? formatUtcInZone(endIso, otherTz!, END_FMT) : null;
  const otherText = otherStart
    ? otherEnd
      ? `${otherStart} – ${otherEnd}`
      : otherStart
    : null;

  const durationSuffix = durationMinutes ? ` · ${durationMinutes} min` : "";

  return (
    <div className={compact ? "min-w-0 text-xs leading-tight" : "min-w-0 text-sm leading-snug"}>
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
        <span className="min-w-0 break-words font-medium text-foreground [overflow-wrap:anywhere]">{viewerText}</span>
        <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
          ({viewerLabel}){durationSuffix && !otherText ? durationSuffix : ""}
        </span>
      </div>
      {otherText && (
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="min-w-0 break-words text-foreground/80 [overflow-wrap:anywhere]">{otherText}</span>
          <span className="min-w-0 break-words text-xs text-muted-foreground [overflow-wrap:anywhere]">
            ({otherLabel}){durationSuffix ? durationSuffix : ""}
          </span>
        </div>
      )}
    </div>
  );
}
