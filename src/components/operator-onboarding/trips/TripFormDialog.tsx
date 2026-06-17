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
import { DURATION_OPTIONS, BOOKING_TYPE_OPTIONS } from "@/lib/trips.shared";
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

  useEffect(() => {
    if (open) {
      const next = initial ?? empty;
      // Inherit environments from profile when creating new (allow narrowing).
      const seeded: TripEditorState = next.id
        ? next
        : {
            ...next,
            environments: next.environments.length > 0 ? next.environments : captainEnvs,
          };
      setForm(seeded);
      setPriceInput(seeded.price_minor != null ? (seeded.price_minor / 100).toString() : "");
      setExtraInput(seeded.per_extra_minor != null ? (seeded.per_extra_minor / 100).toString() : "0");
      setSaveAsDefault(!hasDefault);
    }
  }, [open, initial, hasDefault, captainEnvs]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!form.title.trim()) throw new Error("Trip name is required");
      if (!form.duration_minutes) throw new Error("Pick a duration");
      if (form.price_minor == null || form.price_minor < 0)
        throw new Error("Enter a base price");
      if (form.max_party_size == null || form.max_party_size < 1)
        throw new Error("Enter max party size");
      if (form.description.trim().length < 10)
        throw new Error("Description is too short");
      if (form.target_species.length === 0) throw new Error("Pick at least one target fish");
      if (form.environments.length === 0) throw new Error("Pick at least one environment");
      if (form.environments.length > 2) throw new Error("Max 2 environments per trip");
      if (form.techniques.length === 0) throw new Error("Pick at least one technique");
      if (!form.departure_address.trim()) throw new Error("Pick a departure point");

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
          max_party_size: form.max_party_size!,
          currency: captainCurrency,
          template_key: form.template_key ?? null,
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

  const totalPreview =
    form.price_minor != null && form.max_party_size && form.max_party_size > 0
      ? form.price_minor + Math.max(0, form.max_party_size - 1) * (form.per_extra_minor ?? 0)
      : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{form.id ? "Edit trip" : "Create a trip"}</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
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
            <div className="grid grid-cols-2 gap-3">
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
              <Label>Fishing techniques</Label>
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

          {/* 5. Pricing */}
          <section className="space-y-3 rounded-xl border bg-muted/30 p-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Pricing
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="trip-price">Base price (1st angler)</Label>
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
                    placeholder="e.g. 650"
                  />
                </div>
              </div>
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
            </div>
            <div className="space-y-2 max-w-[50%] pr-1.5">
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
            {totalPreview != null && (
              <div className="rounded-lg border bg-background p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">
                    Total at full trip ({form.max_party_size} guests)
                  </span>
                  <span className="font-semibold">
                    {formatMoney(totalPreview, captainCurrency)}
                  </span>
                </div>
              </div>
            )}
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

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
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
