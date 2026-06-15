// Builders for "Add to Calendar" deep links. Pure functions, no side effects.

interface CalendarEvent {
  title: string;
  details: string;
  location?: string;
  startIso: string; // ISO 8601 UTC
  endIso?: string; // defaults to start + 60min
}

function toGoogleStamp(iso: string): string {
  // Google expects YYYYMMDDTHHmmssZ
  return iso.replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function defaultEnd(startIso: string, endIso?: string): string {
  if (endIso) return endIso;
  return new Date(new Date(startIso).getTime() + 60 * 60 * 1000).toISOString();
}

export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const end = defaultEnd(event.startIso, event.endIso);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    details: event.details,
    dates: `${toGoogleStamp(event.startIso)}/${toGoogleStamp(end)}`,
  });
  if (event.location) params.set("location", event.location);
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function buildOutlookCalendarUrl(event: CalendarEvent): string {
  const end = defaultEnd(event.startIso, event.endIso);
  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    body: event.details,
    startdt: event.startIso,
    enddt: end,
  });
  if (event.location) params.set("location", event.location);
  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}
