import { useId, useState } from "react";
import {
  Plus,
  MapPin,
  Minus,
  
  HelpCircle,
  ChevronDown,
} from "lucide-react";
import { HowBookingsWorkDialog } from "@/components/HowBookingsWorkDialog";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format-currency";
import { convertMinor } from "@/lib/currency";
import {
  useCurrencyStore,
  type CurrencyCode,
} from "@/stores/useCurrencyStore";
import {
  speciesLabel,
  fishingEnvironmentLabel,
} from "@/lib/operators.shared";
import { CurrencyDisclaimer } from "./CurrencyDisclaimer";
import { CheckDatesDialog } from "./CheckDatesDialog";
import { RequestToBookDialog } from "./RequestToBookDialog";

interface Trip {
  id: string;
  title: string;
  description?: string | null;
  start_time?: string | null;
  duration_minutes: number;
  price_minor: number;
  per_extra_minor?: number | null;
  min_party_size?: number | null;
  max_party_size?: number | null;
  currency: string;
  target_species?: string[] | null;
  environments?: string[] | null;
  techniques?: string[] | null;
  departure_address?: string | null;
  booking_type?: "instant_book" | "request_to_book" | null;
}

interface Props {
  trips: Trip[];
  hostId?: string | null;
  hostHasAvailability?: boolean;
}

function formatDuration(mins: number) {
  if (!mins) return "";
  if (mins >= 60 * 12) return "Overnight";
  const h = Math.round(mins / 60);
  return `${h} hrs`;
}


function formatStartTime(t?: string | null) {
  if (!t) return null;
  const [hh, mm] = t.split(":");
  const h = Number(hh);
  if (Number.isNaN(h)) return null;
  const period = h >= 12 ? "PM" : "AM";
  const hr = h % 12 === 0 ? 12 : h % 12;
  return `${hr}:${mm ?? "00"} ${period}`;
}


function TripCard({
  trip,
  hostId,
  hostHasAvailability,
  defaultOpen,
}: {
  trip: Trip;
  hostId?: string | null;
  hostHasAvailability?: boolean;
  defaultOpen?: boolean;
}) {
  const minParty = Math.max(1, trip.min_party_size ?? 1);
  const maxParty = Math.max(minParty, trip.max_party_size ?? 1);
  const [guests, setGuests] = useState(minParty);
  const [open, setOpen] = useState(!!defaultOpen);
  const [checkDatesOpen, setCheckDatesOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);
  const panelId = useId();

  const display = useCurrencyStore((s) => s.currency);
  const base = ((trip.currency || "USD").toUpperCase()) as CurrencyCode;
  const perExtra = trip.per_extra_minor ?? 0;
  const totalMinorBase =
    trip.price_minor + perExtra * Math.max(0, guests - 1);
  const depositMinorBase = Math.round(totalMinorBase * 0.1);
  const balanceMinorBase = totalMinorBase - depositMinorBase;
  const totalDisplay = convertMinor(totalMinorBase, base, display);
  const depositDisplay = convertMinor(depositMinorBase, base, display);
  const balanceDisplay = convertMinor(balanceMinorBase, base, display);
  const baseDisplay = convertMinor(trip.price_minor, base, display);
  const extraDisplay = convertMinor(perExtra, base, display);

  const envs = trip.environments ?? [];
  const techs = trip.techniques ?? [];
  const species = trip.target_species ?? [];


  const durationLabel = formatDuration(trip.duration_minutes);
  const titleWithDuration = durationLabel
    ? `${trip.title} (${durationLabel})`
    : trip.title;
  const speciesPreview = species
    .slice(0, 3)
    .map((s) => speciesLabel(s))
    .join(", ");

  return (
    <article className="overflow-hidden rounded-2xl border bg-card">
      {/* Header / toggle */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className="flex w-full items-center gap-4 px-5 py-4 text-left transition-colors hover:bg-muted/30"
      >
        <div className="min-w-0 flex-1">
          {/* Top row: title + price */}
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="min-w-0 truncate text-xl font-bold text-foreground">
              {titleWithDuration}
            </h3>
            <div className="whitespace-nowrap text-xl font-bold text-emerald-600">
              {formatCurrency(baseDisplay, display)}
            </div>
          </div>
          {/* Bottom row: species + capacity */}
          <div className="mt-1 flex items-center justify-between gap-3">
            <p className="min-w-0 truncate text-sm text-muted-foreground">
              {speciesPreview ? `Fishing for: ${speciesPreview}` : ""}
            </p>
            {maxParty > 0 && (
              <p className="whitespace-nowrap text-sm text-muted-foreground">
                Shared trip: Up to {maxParty} guests
              </p>
            )}
          </div>
          {(envs.length > 0 || techs.length > 0) && (
            <p className="mt-0.5 truncate text-sm text-muted-foreground">
              Experience:{" "}
              {[
                ...envs.map((e) => fishingEnvironmentLabel(e)),
                ...techs,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
          )}
        </div>
        <ChevronDown
          className={`h-5 w-5 shrink-0 self-center text-muted-foreground transition-transform duration-300 ${
            open ? "rotate-180" : ""
          }`}
        />
      </button>


      {/* Collapsible body */}
      <div
        id={panelId}
        className={`grid transition-all duration-300 ease-in-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div className="border-t bg-card px-5 pb-6 pt-5 lg:px-6 lg:min-w-[380px]">
            {/* Description + meeting location */}
            <div className="space-y-3">
              {trip.description && (
                <p className="whitespace-pre-line text-sm text-foreground/80">
                  {trip.description}
                </p>
              )}

              {trip.departure_address && (
                <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span className="line-clamp-2">{trip.departure_address}</span>
                </div>
              )}
            </div>

            {/* Guests stepper */}
            <div className="mt-5">
              <div className="mb-1.5 text-sm font-medium">Guests</div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  disabled={guests <= minParty}
                  onClick={() => setGuests((g) => Math.max(minParty, g - 1))}
                  aria-label="Decrease guests"
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <span className="min-w-[2ch] text-center text-base font-semibold">
                  {guests}
                </span>
                <Button
                  type="button"
                  size="icon"
                  variant="outline"
                  className="h-9 w-9"
                  disabled={guests >= maxParty}
                  onClick={() => setGuests((g) => Math.min(maxParty, g + 1))}
                  aria-label="Increase guests"
                >
                  <Plus className="h-4 w-4" />
                </Button>
                <span className="ml-1 text-sm text-muted-foreground">
                  of {maxParty}
                </span>
                {perExtra > 0 && (
                  <span className="ml-auto text-xs text-muted-foreground">
                    +{formatCurrency(extraDisplay, display)} / extra guest
                  </span>
                )}
              </div>
              {minParty > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Minimum {minParty} guests required.
                </p>
              )}
            </div>

            {/* Payment summary */}
            <div className="mt-5 overflow-hidden rounded-xl border border-emerald-200 bg-card">
              <div className="bg-emerald-50 px-5 py-5 text-center">
                <div className="text-sm font-bold uppercase tracking-wide text-emerald-900">
                  Due Now to Book
                </div>
                <div className="mt-0.5 text-xs text-emerald-900/70">
                  Charged today to secure your spot
                </div>
                <div className="mt-2 whitespace-nowrap text-4xl font-extrabold leading-none text-emerald-700 sm:text-5xl">
                  {formatCurrency(depositDisplay, display)}
                </div>
              </div>
              <div className="space-y-2 px-5 py-4 text-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-foreground/80">Total Trip Cost</span>
                  <span className="whitespace-nowrap font-semibold text-foreground">
                    {formatCurrency(totalDisplay, display)}
                  </span>
                </div>
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-foreground/80">Remaining Balance</div>
                    <div className="text-xs text-muted-foreground">
                      Paid directly to guide at boat
                    </div>
                  </div>
                  <span className="whitespace-nowrap font-semibold text-foreground">
                    {formatCurrency(balanceDisplay, display)}
                  </span>
                </div>
              </div>
            </div>

            <CurrencyDisclaimer
              baseCurrency={base}
              displayCurrency={display}
              className="mt-3"
            />

            {(() => {
              const bt = trip.booking_type ?? "request_to_book";
              const instantReady =
                bt === "instant_book" && hostHasAvailability && !!hostId;
              const instantNotReady =
                bt === "instant_book" && (!hostHasAvailability || !hostId);

              return (
                <>
                  {instantNotReady && (
                    <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      The calendar isn&apos;t updated for this trip yet —
                      instant booking isn&apos;t available. You can still send
                      the host a request below.
                    </p>
                  )}
                  <Button
                    className="mt-3 w-full bg-gold text-ocean-deep hover:bg-gold-deep"
                    onClick={() =>
                      instantReady
                        ? setCheckDatesOpen(true)
                        : setRequestOpen(true)
                    }
                  >
                    {instantReady ? "Check Dates" : "Request to Book"}
                  </Button>
                  <p className="mt-2 text-center text-xs text-muted-foreground">
                    You are only paying a 10% deposit online today. The
                    remaining 90% balance is paid directly to your captain at
                    the dock.
                  </p>
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {hostId ? (
        <CheckDatesDialog
          open={checkDatesOpen}
          onOpenChange={setCheckDatesOpen}
          tripId={trip.id}
          hostId={hostId}
          tripTitle={trip.title}
          guests={guests}
        />
      ) : null}

      <RequestToBookDialog
        open={requestOpen}
        onOpenChange={setRequestOpen}
        tripId={trip.id}
        tripTitle={trip.title}
        defaultStartTime={trip.start_time ?? null}
        defaultDurationHours={Math.max(
          1,
          Math.round((trip.duration_minutes ?? 240) / 60),
        )}
        minParty={minParty}
        maxParty={maxParty}
      />
    </article>
  );
}

export function TripsBlock({ trips, hostId, hostHasAvailability }: Props) {
  const [helpOpen, setHelpOpen] = useState(false);

  return (
    <section id="trips" className="scroll-mt-32 space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-2xl font-bold tracking-tight">
          Trip availability and prices
        </h2>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="self-start sm:self-auto text-primary hover:text-primary"
          onClick={() => setHelpOpen(true)}
        >
          <HelpCircle className="mr-1.5 h-4 w-4" />
          How Bookings Work
        </Button>
      </div>

      {trips.length === 0 ? (
        <div className="rounded-2xl border border-dashed bg-card p-10 text-center">
          <h3 className="text-lg font-semibold">No trips added yet</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add your first trip so guests can book.
          </p>
          <Button asChild className="mt-4">
            <Link to="/dashboard/my-listing">
              <Plus className="mr-1 h-4 w-4" /> Add a trip
            </Link>
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((t, i) => (
            <TripCard
              key={t.id}
              trip={t}
              hostId={hostId}
              hostHasAvailability={hostHasAvailability}
              defaultOpen={i === 0}
            />
          ))}
        </div>
      )}

      <HowBookingsWorkDialog
        open={helpOpen}
        onOpenChange={setHelpOpen}
        slug="how-it-works-for-anglers"
        title="How Bookings Work for Anglers"
      />
    </section>
  );
}
