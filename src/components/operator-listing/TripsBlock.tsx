import { useState } from "react";
import {
  Clock,
  Plus,
  MapPin,
  Minus,
  Fish,
  HelpCircle,
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
  return `${h}h trip`;
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded-full border bg-muted/40 px-2.5 py-0.5 text-xs text-muted-foreground">
      {children}
    </span>
  );
}

function TripCard({
  trip,
  hostId,
  hostHasAvailability,
}: {
  trip: Trip;
  hostId?: string | null;
  hostHasAvailability?: boolean;
}) {
  const minParty = Math.max(1, trip.min_party_size ?? 1);
  const maxParty = Math.max(minParty, trip.max_party_size ?? 1);
  const [guests, setGuests] = useState(minParty);
  const [checkDatesOpen, setCheckDatesOpen] = useState(false);
  const [requestOpen, setRequestOpen] = useState(false);

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

  const startLabel = formatStartTime(trip.start_time);
  const envs = trip.environments ?? [];
  const techs = trip.techniques ?? [];
  const species = trip.target_species ?? [];

  return (
    <article className="rounded-2xl border bg-card p-5">
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        {/* LEFT: trip content */}
        <div className="min-w-0 space-y-3">
          <div>
            <h3 className="text-lg font-semibold">{trip.title}</h3>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              {startLabel && (
                <span className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" />
                  Departs {startLabel}
                </span>
              )}
              {trip.duration_minutes ? (
                <span>· {formatDuration(trip.duration_minutes)}</span>
              ) : null}
              {maxParty ? <span>· Up to {maxParty} guests</span> : null}
            </div>
          </div>

          {(envs.length > 0 || techs.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {envs.map((e) => (
                <Chip key={`e-${e}`}>{fishingEnvironmentLabel(e)}</Chip>
              ))}
              {techs.map((t) => (
                <Chip key={`t-${t}`}>{t}</Chip>
              ))}
            </div>
          )}

          {trip.description && (
            <p className="whitespace-pre-line text-sm text-foreground/80">
              {trip.description}
            </p>
          )}

          {species.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 text-sm">
              <Fish className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">Targeting:</span>
              {species.slice(0, 8).map((s) => (
                <Chip key={`s-${s}`}>{speciesLabel(s)}</Chip>
              ))}
              {species.length > 8 && (
                <span className="text-xs text-muted-foreground">
                  +{species.length - 8} more
                </span>
              )}
            </div>
          )}

          {trip.departure_address && (
            <div className="flex items-start gap-1.5 text-sm text-muted-foreground">
              <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span className="line-clamp-2">{trip.departure_address}</span>
            </div>
          )}
        </div>

        {/* RIGHT: price + guests selector */}
        <aside className="rounded-xl border bg-muted/20 p-5 lg:min-w-[360px]">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            From
          </div>
          <div className="text-2xl font-bold text-ocean-deep">
            {formatCurrency(baseDisplay, display)}
          </div>
          <div className="text-sm text-muted-foreground">
            base · 1 guest
          </div>

          {perExtra > 0 && (
            <p className="mt-2 text-sm text-muted-foreground">
              The base price is for 1 person. After that it&apos;s{" "}
              {formatCurrency(extraDisplay, display)} per each additional person per day.
            </p>
          )}

          {minParty > 1 && (
            <p className="mt-2 text-sm font-medium text-foreground">
              This trip requires a minimum of {minParty} people.
            </p>
          )}

          {/* Guests stepper */}
          <div className="mt-4">
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
            </div>
          </div>

          <div className="mt-4 overflow-hidden rounded-xl border-2 border-gold/60 bg-card">
            {/* Due Now callout */}
            <div className="bg-gold/15 px-5 py-4 text-center text-ocean-deep">
              <div className="text-sm font-bold uppercase tracking-wide">
                Due now to book
              </div>
              <div className="mt-1 text-3xl font-extrabold leading-tight">
                {formatCurrency(depositDisplay, display)}
              </div>
              <div className="mt-1 text-sm opacity-80">
                (Charged today to secure your spot)
              </div>
            </div>
            {/* Breakdown rows */}
            <div className="space-y-2 px-5 py-4 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground/80">Total trip cost:</span>
                <span className="whitespace-nowrap font-semibold text-foreground">
                  {formatCurrency(totalDisplay, display)}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-foreground/80">Remaining balance:</span>
                <span className="whitespace-nowrap font-semibold text-foreground">
                  {formatCurrency(balanceDisplay, display)}
                </span>
              </div>
              <p className="pt-1 text-xs text-muted-foreground">
                Paid directly to your guide when you meet.
              </p>
            </div>
          </div>
          <CurrencyDisclaimer
            baseCurrency={base}
            displayCurrency={display}
            className="mt-3"
          />


          {(() => {
            const bt = trip.booking_type ?? "request_to_book";
            const instantReady = bt === "instant_book" && hostHasAvailability && !!hostId;
            const instantNotReady = bt === "instant_book" && (!hostHasAvailability || !hostId);

            if (instantReady) {
              return (
                <Button
                  className="mt-3 w-full bg-gold text-ocean-deep hover:bg-gold-deep"
                  onClick={() => setCheckDatesOpen(true)}
                >
                  Check Dates
                </Button>
              );
            }
            return (
              <>
                {instantNotReady && (
                  <p className="mt-3 rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-900">
                    The calendar isn&apos;t updated for this trip yet — instant booking
                    isn&apos;t available. You can still send the host a request below.
                  </p>
                )}
                <Button
                  className="mt-3 w-full bg-gold text-ocean-deep hover:bg-gold-deep"
                  onClick={() => setRequestOpen(true)}
                >
                  Request to Book
                </Button>
              </>
            );
          })()}
        </aside>
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
        defaultDurationHours={Math.max(1, Math.round((trip.duration_minutes ?? 240) / 60))}
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
        <div className="space-y-4">
          {trips.map((t) => (
            <TripCard
              key={t.id}
              trip={t}
              hostId={hostId}
              hostHasAvailability={hostHasAvailability}
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
