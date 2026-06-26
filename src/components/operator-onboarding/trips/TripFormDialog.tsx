import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Checkbox } from "@/components/ui/checkbox";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X } from "lucide-react";
import { upsertTrip, getMyCapabilities } from "@/lib/trips.functions";
import { saveDefaultDeparture } from "@/lib/operators.functions";
import {
  DURATION_OPTIONS,
  getTripTypeOptions,
  isSharedTripType,
  isPrivateTripType,
  type TripType,
} from "@/lib/trips.shared";
import {
  FISHING_ENVIRONMENTS,
  FISHING_TECHNIQUES,
  fishingEnvironmentLabel,
  speciesLabel,
} from "@/lib/operators.shared";
import { DeparturePointPicker } from "./DeparturePointPicker";
import { useOperatorOnboardingStore } from "@/stores/useOperatorOnboardingStore";

export interface TripEditorState {
  id?: string | null;
  title: string;
  description: string;
  start_time: string;
  duration_minutes: number | null;
  price_minor: number | null;
  per_extra_minor: number | null;
  min_party_size: number | null;
  max_party_size: number | null;
  template_key?: string | null;
  booking_type: "instant_book" | "request_to_book";
  charter_type: TripType;
  seats_available: number | null;
  min_seats_to_sail?: number | null;

  target_species: string[];
  environments: string[];
  techniques: string[];
  departure_address: string;
  departure_lat: number | null;
  departure_lng: number | null;
  departure_place_id: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial: TripEditorState | null;
}

const empty: TripEditorState = {
  id: null,
  title: "",
  description: "",
  start_time: "",
  duration_minutes: null,
  price_minor: null,
  per_extra_minor: 0,
  min_party_size: 1,
  max_party_size: null,
  template_key: null,
  booking_type: "request_to_book",
  charter_type: "private_charter",
  seats_available: null,
  min_seats_to_sail: null,

  target_species: [],
  environments: [],
  techniques: [],
  departure_address: "",
  departure_lat: null,
  departure_lng: null,
  departure_place_id: null,
};

function formatMoney(minor: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(minor / 100);
}

export function TripFormDialog({ open, onOpenChange, initial }: Props) {
  const [form, setForm] = useState<TripEditorState>(initial ?? empty);
  const [priceInput, setPriceInput] = useState("");
  const [extraInput, setExtraInput] = useState("");
  const defaultDeparture = useOperatorOnboardingStore((s) => s.default_departure);
  const setDefaultDeparture = useOperatorOnboardingStore((s) => s.setDefaultDeparture);
  const setStep = useOperatorOnboardingStore((s) => s.setStep);
  const hasDefault = !!defaultDeparture.address;
  const [saveAsDefault, setSaveAsDefault] = useState(!hasDefault);
  const qc = useQueryClient();
  const upsertFn = useServerFn(upsertTrip);
  const saveDefaultFn = useServerFn(saveDefaultDeparture);
  const capabilitiesFn = useServerFn(getMyCapabilities);

  const { data: caps } = useQuery({
    queryKey: ["my-capabilities"],
    queryFn: () => capabilitiesFn(),
    enabled: open,
  });
  const captainCurrency = caps?.base_currency ?? "USD";
  const captainSpecies = useMemo(() => caps?.target_species ?? [], [caps]);
  const captainEnvs = useMemo(() => caps?.fishing_environments ?? [], [caps]);
  const businessType = caps?.business_type ?? null;
  const tripTypeOptions = useMemo(() => getTripTypeOptions(businessType), [businessType]);
  const isGuide = businessType === "guide";
  const defaultPrivateType: TripType = isGuide ? "private_trip" : "private_charter";

  useEffect(() => {
    if (open) {
      const next = initial ?? empty;
      // Inherit environments from profile when creating new (allow narrowing).
      // For new trips, default the trip-type pair to the operator's business type.
      const seeded: TripEditorState = next.id
        ? next
        : {
            ...next,
            environments: next.environments.length > 0 ? next.environments : captainEnvs,
            charter_type: defaultPrivateType,
          };
      setForm(seeded);
      setPriceInput(seeded.price_minor != null ? (seeded.price_minor / 100).toString() : "");
      setExtraInput(seeded.per_extra_minor != null ? (seeded.per_extra_minor / 100).toString() : "0");
      setSaveAsDefault(!hasDefault);
    }
  }, [open, initial, hasDefault, captainEnvs, defaultPrivateType]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Trip name is required");
      if (!form.duration_minutes) throw new Error("Pick a duration");
      if (form.price_minor == null || form.price_minor < 0)
        throw new Error("Enter a base price");
      if (isPrivateTripType(form.charter_type)) {
        if (form.max_party_size == null || form.max_party_size < 1)
          throw new Error("Enter max party size");
      }

      if (form.description.trim().length < 10)
        throw new Error("Description is too short");
      if (form.target_species.length === 0) throw new Error("Pick at least one target fish");
      if (form.environments.length === 0) throw new Error("Pick at least one environment");
      if (form.environments.length > 2) throw new Error("Max 2 environments per trip");
      if (form.techniques.length === 0) throw new Error("Pick at least one fishing style");
      if (!form.departure_address.trim()) throw new Error("Pick a departure point");
      if (isSharedTripType(form.charter_type)) {
        if (form.seats_available == null || form.seats_available < 1)
          throw new Error(isGuide ? "Enter total spots available" : "Enter total seats available");
        if (
          form.min_seats_to_sail != null &&
          form.min_seats_to_sail > (form.seats_available ?? 0)
        )
          throw new Error(isGuide ? "Minimum spots required can't exceed total spots available" : "Minimum seats to sail can't exceed total seats available");
      }


      const result = await upsertFn({
        data: {
          id: form.id ?? null,
          title: form.title.trim(),
          description: form.description.trim(),
          start_time: form.start_time || null,
          duration_minutes: form.duration_minutes!,
          price_minor: form.price_minor!,
          per_extra_minor: form.per_extra_minor ?? 0,
          min_party_size: form.min_party_size ?? 1,
          max_party_size:
            isSharedTripType(form.charter_type)
              ? (form.seats_available ?? 1)
              : form.max_party_size!,

          currency: captainCurrency,
          template_key: form.template_key ?? null,
          booking_type: form.booking_type,
          charter_type: form.charter_type,
          seats_available:
            isSharedTripType(form.charter_type) ? form.seats_available : null,
          min_seats_to_sail:
            isSharedTripType(form.charter_type) ? form.min_seats_to_sail ?? null : null,

          target_species: form.target_species,
          environments: form.environments,
          techniques: form.techniques,
          departure_address: form.departure_address.trim(),
          departure_lat: form.departure_lat,
          departure_lng: form.departure_lng,
          departure_place_id: form.departure_place_id,
        },
      });
      if (saveAsDefault) {
        try {
          await saveDefaultFn({
            data: {
              address: form.departure_address.trim(),
              lat: form.departure_lat,
              lng: form.departure_lng,
              place_id: form.departure_place_id,
            },
          });
          setDefaultDeparture({
            address: form.departure_address.trim(),
            lat: form.departure_lat,
            lng: form.departure_lng,
            place_id: form.departure_place_id,
            city: null,
            state: null,
            country: null,
          });
        } catch (e) {
          console.warn("Could not save default departure", e);
        }
      }
      return result;
    },
    onSuccess: () => {
      toast.success(form.id ? "Trip updated" : "Trip added");
      qc.invalidateQueries({ queryKey: ["my-trips"] });
      onOpenChange(false);
    },
    onError: (e: any) => toast.error(e?.message ?? "Could not save trip"),
  });

  const isShared = isSharedTripType(form.charter_type);
  const isPrivateCharter = form.charter_type === "private_charter";
  const totalPreview = isShared
    ? form.price_minor != null && form.seats_available && form.seats_available > 0
      ? form.price_minor * form.seats_available
      : null
    : isPrivateCharter
      ? form.price_minor
      : form.price_minor != null && form.max_party_size && form.max_party_size > 0
        ? form.price_minor + Math.max(0, form.max_party_size - 1) * (form.per_extra_minor ?? 0)
        : null;


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[calc(100vw-1rem)] max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit trip" : "Create a trip"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* 0. Trip type (private vs shared, scoped to operator business type) */}
          <section className="space-y-3 rounded-xl border-2 border-primary/20 bg-primary/5 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Trip type
            </h3>
            <div className="grid gap-3 sm:grid-cols-2">
              {tripTypeOptions.map((opt) => {
                const selected = form.charter_type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => {
                      if (isSharedTripType(opt.value) || opt.value === "private_charter") {
                        setExtraInput("0");
                      }
                      setForm((f) => ({
                        ...f,
                        charter_type: opt.value,
                        ...(isSharedTripType(opt.value)
                          ? {
                              per_extra_minor: 0,
                              seats_available:
                                f.seats_available ?? f.max_party_size ?? null,
                            }
                          : opt.value === "private_charter"
                            ? { per_extra_minor: 0 }
                            : {}),
                      }));
                    }}
                    className={`rounded-lg border p-4 text-left transition-colors ${
                      selected
                        ? "border-primary bg-background ring-2 ring-primary"
                        : "border-border bg-background hover:border-primary/40"
                    }`}
                  >
                    <div className="text-base font-semibold">{opt.label}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{opt.hint}</div>
                  </button>
                );
              })}
            </div>
          </section>

          {/* 1. Title */}

          <div className="space-y-2">
            <Label htmlFor="trip-title">Trip title</Label>
            <Input
              id="trip-title"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Half-Day Deep Sea"
            />
          </div>

          {/* 2. Trip details */}
          <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Trip details
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trip-start">Start time</Label>
                <Input
                  id="trip-start"
                  type="time"
                  value={form.start_time}
                  onChange={(e) => setForm({ ...form, start_time: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Duration</Label>
                <Select
                  value={form.duration_minutes ? String(form.duration_minutes) : ""}
                  onValueChange={(v) => setForm({ ...form, duration_minutes: Number(v) })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Pick duration" />
                  </SelectTrigger>
                  <SelectContent>
                    {DURATION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={String(o.value)}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </section>

          {/* 3. Description */}
          <section className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="trip-desc">Trip description</Label>
              <Textarea
                id="trip-desc"
                rows={4}
                maxLength={2000}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="What's included, the experience, what to bring…"
              />
            </div>
          </section>

          {/* 4. Scoped selections */}
          <section className="space-y-4 rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              What you'll target
            </h3>

            {/* Target species */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Target fish</Label>
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    setStep("fishing_focus");
                    onOpenChange(false);
                  }}
                >
                  Edit Target Fish Options
                </button>
              </div>
              {captainSpecies.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add species to your profile first.
                </p>
              ) : (
                <SearchableMultiSelect
                  options={captainSpecies.map((id) => ({ value: id, label: speciesLabel(id) }))}
                  selected={form.target_species}
                  onChange={(v) => setForm({ ...form, target_species: v })}
                  placeholder="Search species…"
                />
              )}
            </div>

            {/* Environments */}
            <div className="space-y-2">
              <Label>Fishing environment (max 2)</Label>
              <div className="flex flex-wrap gap-2">
                {(captainEnvs.length > 0 ? captainEnvs : FISHING_ENVIRONMENTS.map((e) => e.id)).map((id) => {
                  const selected = form.environments.includes(id);
                  return (
                    <button
                      key={id}
                      type="button"
                      onClick={() => {
                        if (selected) {
                          setForm({ ...form, environments: form.environments.filter((x) => x !== id) });
                        } else {
                          if (form.environments.length >= 2) {
                            toast.error("Max 2 environments per trip");
                            return;
                          }
                          setForm({ ...form, environments: [...form.environments, id] });
                        }
                      }}
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {fishingEnvironmentLabel(id)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Techniques */}
            <div className="space-y-2">
              <Label>Fishing Style</Label>
              <div className="flex flex-wrap gap-2">
                {FISHING_TECHNIQUES.map((t) => {
                  const selected = form.techniques.includes(t);
                  return (
                    <button
                      key={t}
                      type="button"
                      onClick={() =>
                        setForm({
                          ...form,
                          techniques: selected
                            ? form.techniques.filter((x) => x !== t)
                            : [...form.techniques, t],
                        })
                      }
                      className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background hover:border-primary/40"
                      }`}
                    >
                      {t}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Booking method is fixed to Request to Book — captain can switch
              to Instant Book later on the Manage Availability page. */}

          {/* 5. Pricing */}
          <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pricing
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="trip-price">
                  {isShared
                    ? (isGuide ? "Price per Person" : "Price per Seat")
                    : isPrivateCharter
                      ? "Base Price (Entire Boat)"
                      : "Base price (1st angler)"}
                </Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {captainCurrency}
                  </span>
                  <Input
                    id="trip-price"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    className="pl-14"
                    value={priceInput}
                    onChange={(e) => {
                      setPriceInput(e.target.value);
                      const n = Number(e.target.value);
                      setForm({
                        ...form,
                        price_minor: Number.isFinite(n) ? Math.round(n * 100) : null,
                      });
                    }}
                    placeholder={isShared ? "e.g. 220" : isPrivateCharter ? "e.g. 850" : "e.g. 650"}
                  />
                </div>
                {isShared ? (
                  <p className="text-xs text-muted-foreground">
                    {isGuide
                      ? "Enter the cost for an individual spot on this trip."
                      : "Enter the cost for an individual seat on this trip."}
                  </p>
                ) : isPrivateCharter ? (
                  <div className="space-y-0.5">
                    <p className="text-xs font-medium text-foreground">Total Trip Price (Private Boat)</p>
                    <p className="text-xs text-muted-foreground">
                      The total trip price for booking this charter boat with a max party size of {form.max_party_size ?? "N"} guests.
                    </p>
                  </div>
                ) : null}
              </div>
              {isShared ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="trip-seats">
                      {isGuide ? "Total Spots Available" : "Total Seats Available"}
                    </Label>
                    <Input
                      id="trip-seats"
                      type="number"
                      min={1}
                      max={50}
                      step="1"
                      value={form.seats_available ?? ""}
                      onChange={(e) => {
                        const n = parseInt(e.target.value, 10);
                        setForm({ ...form, seats_available: Number.isFinite(n) ? n : null });
                      }}
                      placeholder="e.g. 6"
                    />
                    <p className="text-xs text-muted-foreground">
                      {isGuide
                        ? "Enter the maximum number of individual spots you can sell in total for this trip (e.g., 6)."
                        : "Enter the maximum number of individual seats you can sell in total for this shared trip (e.g., 6)."}
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trip-min-sail">
                      {isGuide ? "Minimum Spots Required (optional)" : "Minimum Seats to Sail (optional)"}
                    </Label>
                    <Input
                      id="trip-min-sail"
                      type="number"
                      min={1}
                      max={form.seats_available ?? 50}
                      step="1"
                      value={form.min_seats_to_sail ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        if (raw === "") {
                          setForm({ ...form, min_seats_to_sail: null });
                          return;
                        }
                        const n = parseInt(raw, 10);
                        setForm({
                          ...form,
                          min_seats_to_sail: Number.isFinite(n) ? n : null,
                        });
                      }}
                      placeholder="e.g. 3"
                    />
                    <p className="text-xs text-muted-foreground">
                      If this number isn&apos;t reached 24 hours before the trip,
                      we&apos;ll warn you on your dashboard so you can decide to
                      cancel/refund or run it anyway. Leave blank to always run.
                    </p>
                    {form.min_seats_to_sail != null &&
                      form.seats_available != null &&
                      form.min_seats_to_sail > form.seats_available && (
                        <p className="text-xs text-destructive">
                          {isGuide
                            ? `Minimum can't exceed total spots (${form.seats_available}).`
                            : `Minimum can't exceed total seats (${form.seats_available}).`}
                        </p>
                      )}
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  <Label htmlFor="trip-party">Max trip size</Label>
                  <Input
                    id="trip-party"
                    type="number"
                    min={1}
                    max={50}
                    step="1"
                    value={form.max_party_size ?? ""}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10);
                      setForm({ ...form, max_party_size: Number.isFinite(n) ? n : null });
                    }}
                    placeholder="e.g. 6"
                  />
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-min-party">Min trip size</Label>
              <Input
                id="trip-min-party"
                type="number"
                min={1}
                max={50}
                step="1"
                value={form.min_party_size ?? ""}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  setForm({ ...form, min_party_size: Number.isFinite(n) ? n : 1 });
                }}
                placeholder="e.g. 2"
              />
              <p className="text-xs text-muted-foreground">
                The trip requires at least this many guests to run.
              </p>
            </div>
            {!isShared && !isPrivateCharter && (
              <div className="space-y-2">
                <Label htmlFor="trip-extra">Price per additional angler</Label>
                <div className="relative">
                  <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                    {captainCurrency}
                  </span>
                  <Input
                    id="trip-extra"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="1"
                    className="pl-14"
                    value={extraInput}
                    onChange={(e) => {
                      setExtraInput(e.target.value);
                      const n = Number(e.target.value);
                      setForm({
                        ...form,
                        per_extra_minor: Number.isFinite(n) ? Math.round(n * 100) : 0,
                      });
                    }}
                    placeholder="e.g. 75"
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Charged for each extra guest beyond the first, up to your max party size.
                </p>
              </div>
            )}

            {totalPreview != null && (() => {
              const depositMinor = Math.round(totalPreview * 0.1);
              const takeHomeMinor = totalPreview - depositMinor;
              return (
                <>
                  <div className="rounded-lg border bg-background p-3 text-sm space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">
                          {isShared ? "Total if fully booked" : "Total Trip Price (Full Boat)"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {isShared
                            ? isGuide
                              ? `Assumes all ${form.seats_available ?? 0} spots are sold.`
                              : `Assumes all ${form.seats_available ?? 0} seats are sold.`
                            : isPrivateCharter
                              ? `Flat rate for the entire boat (up to ${form.max_party_size ?? "N"} guests).`
                              : `Assumes the trip is booked to your max party size of ${form.max_party_size} guests.`}
                        </div>

                      </div>
                      <span className="font-semibold whitespace-nowrap">
                        {formatMoney(totalPreview, captainCurrency)}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="font-medium">Deposit to Fishtrippers (10%)</div>
                        <div className="text-xs text-muted-foreground">
                          Paid by the customer online at booking.
                        </div>
                      </div>
                      <span className="font-semibold whitespace-nowrap">
                        {formatMoney(depositMinor, captainCurrency)}
                      </span>
                    </div>
                    <div className="border-t pt-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="font-semibold">Your Take-Home Cash (90%)</div>
                        <div className="text-xs text-muted-foreground">
                          Paid directly to you by the customer when you meet.
                        </div>
                      </div>
                      <span className="text-base font-bold whitespace-nowrap">
                        {formatMoney(takeHomeMinor, captainCurrency)}
                      </span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Fishtrippers collects our 10% matchmaking fee upfront from the customer's deposit. You collect the remaining 90% balance when you meet.
                  </p>
                </>
              );
            })()}
          </section>

          {/* Departure */}
          <div className="space-y-2">
            <Label>Departure point</Label>
            <DeparturePointPicker
              value={{
                address: form.departure_address,
                lat: form.departure_lat,
                lng: form.departure_lng,
                placeId: form.departure_place_id,
              }}
              onChange={(v) =>
                setForm({
                  ...form,
                  departure_address: v.address,
                  departure_lat: v.lat,
                  departure_lng: v.lng,
                  departure_place_id: v.placeId,
                })
              }
            />
            <label className="mt-2 flex items-start gap-2 rounded-lg border bg-muted/30 p-3 text-sm cursor-pointer">
              <Checkbox
                checked={saveAsDefault}
                onCheckedChange={(v) => setSaveAsDefault(v === true)}
                className="mt-0.5"
              />
              <span className="leading-snug">
                <span className="font-medium">Save as my default departure point</span>
                <span className="block text-xs text-muted-foreground">
                  {hasDefault
                    ? "Update your default so new trips prefill with this location."
                    : "We'll prefill this for every new trip so you don't have to retype it."}
                </span>
              </span>
            </label>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} className="w-full sm:w-auto">
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-full sm:w-auto">
            {mutation.isPending ? "Saving…" : form.id ? "Save changes" : "Add trip"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ---------- Inline searchable multi-select ----------

interface MSOption {
  value: string;
  label: string;
}

function SearchableMultiSelect({
  options,
  selected,
  onChange,
  placeholder,
}: {
  options: MSOption[];
  selected: string[];
  onChange: (v: string[]) => void;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const available = options.filter((o) => !selected.includes(o.value));
  const labelFor = (id: string) =>
    options.find((o) => o.value === id)?.label ?? id;

  return (
    <div className="space-y-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="w-full justify-between font-normal">
            {placeholder ?? "Add…"}
            <span className="text-xs text-muted-foreground">{selected.length} selected</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
          <Command>
            <CommandInput placeholder="Search…" />
            <CommandList>
              <CommandEmpty>No matches.</CommandEmpty>
              <CommandGroup>
                {available.map((o) => (
                  <CommandItem
                    key={o.value}
                    value={o.label}
                    onSelect={() => {
                      onChange([...selected, o.value]);
                    }}
                  >
                    {o.label}
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pr-1">
              {labelFor(id)}
              <button
                type="button"
                onClick={() => onChange(selected.filter((x) => x !== id))}
                className="ml-0.5 rounded-full p-0.5 hover:bg-background/50"
                aria-label={`Remove ${labelFor(id)}`}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
