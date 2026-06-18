import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  Zap,
  ChevronDown,
  X,
} from "lucide-react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import {
  searchOperatorsServer,
  type OperatorCardDTO,
} from "@/lib/operators-search.functions";
import { OperatorCard } from "@/components/listings/OperatorCard";
import { FISHING_ENVIRONMENTS } from "@/lib/operators.shared";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { LocationAutocomplete } from "@/components/search/LocationAutocomplete";
import { Checkbox } from "@/components/ui/checkbox";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  DURATION_BUCKETS,
  DEPARTURE_BUCKETS,
  PRICE_PRESETS,
  PRICE_MIN,
  PRICE_MAX,
  PRICE_STEP,
  TECHNIQUE_OPTIONS,
  SPECIES_OPTIONS,
  csvToList,
  listToCsv,
} from "@/lib/trip-filters";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  state: fallback(z.string(), "").default(""),
  country: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  instantBook: fallback(z.boolean(), false).default(false),
  tripDate: fallback(z.string(), "").default(""),
  adults: fallback(z.number().int().min(1).max(20), 2).default(2),
  children: fallback(z.number().int().min(0).max(20), 0).default(0),
  duration: fallback(z.string(), "").default(""),
  departureTime: fallback(z.string(), "").default(""),
  priceMin: fallback(z.number().int().min(0).max(PRICE_MAX), PRICE_MIN).default(PRICE_MIN),
  priceMax: fallback(z.number().int().min(0).max(PRICE_MAX), PRICE_MAX).default(PRICE_MAX),
  technique: fallback(z.string(), "").default(""),
  species: fallback(z.string(), "").default(""),
});

type SearchState = z.infer<typeof searchSchema>;

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Browse Fishing Charters & Guides — FishTrippers" },
      {
        name: "description",
        content:
          "Search verified fishing charters and guides by city, fishing environment, and more.",
      },
    ],
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();

  const [cityInput, setCityInput] = useState(search.city);

  const techniqueList = useMemo(() => csvToList(search.technique), [search.technique]);
  const speciesList = useMemo(() => csvToList(search.species), [search.species]);
  const priceMinActive = search.priceMin > PRICE_MIN;
  const priceMaxActive = search.priceMax < PRICE_MAX;
  const priceActive = priceMinActive || priceMaxActive;

  const searchFn = useServerFn(searchOperatorsServer);
  const liveQuery = useQuery({
    queryKey: [
      "search-operators",
      search.q,
      search.city,
      search.state,
      search.country,
      search.category,
      search.instantBook,
      search.duration,
      search.departureTime,
      search.priceMin,
      search.priceMax,
      search.technique,
      search.species,
    ],
    queryFn: () =>
      searchFn({
        data: {
          q: search.q || null,
          city: search.city || null,
          state: search.state || null,
          country: search.country || null,
          category: search.category || null,
          instantBook: search.instantBook || null,
          durationMinMinutes:
            DURATION_BUCKETS.find((b) => b.value === search.duration)?.minMinutes ?? null,
          durationMaxMinutes:
            DURATION_BUCKETS.find((b) => b.value === search.duration)?.maxMinutes ?? null,
          departureStart:
            DEPARTURE_BUCKETS.find((b) => b.value === search.departureTime)?.startTime ?? null,
          departureEnd:
            DEPARTURE_BUCKETS.find((b) => b.value === search.departureTime)?.endTime ?? null,
          priceMinMinor: priceMinActive ? search.priceMin * 100 : null,
          priceMaxMinor: priceMaxActive ? search.priceMax * 100 : null,
          techniques: techniqueList.length ? techniqueList : null,
          species: speciesList.length ? speciesList : null,
        },
      }),
  });

  const results: OperatorCardDTO[] = liveQuery.data?.items ?? [];

  function setSearch(next: Partial<SearchState>) {
    navigate({
      to: "/search",
      search: (prev: Partial<SearchState>) => ({ ...prev, ...next }),
      replace: true,
    });
  }

  function submitTopBar() {
    setSearch({ city: cityInput, state: "", country: "" });
  }

  function clearAllTripFilters() {
    setSearch({
      duration: "",
      departureTime: "",
      priceMin: PRICE_MIN,
      priceMax: PRICE_MAX,
      technique: "",
      species: "",
    });
  }

  const anyTripFilter =
    !!search.duration ||
    !!search.departureTime ||
    priceActive ||
    techniqueList.length > 0 ||
    speciesList.length > 0;

  const activeCategoryLabel =
    FISHING_ENVIRONMENTS.find((e) => e.id === search.category)?.label ??
    "All trip types";

  const durationLabel = search.duration
    ? DURATION_BUCKETS.find((o) => o.value === search.duration)?.label ?? "Duration"
    : "Duration";

  const departureLabel = search.departureTime
    ? DEPARTURE_BUCKETS.find((o) => o.value === search.departureTime)?.label ??
      "Departure Time"
    : "Departure Time";

  const priceLabel = (() => {
    if (!priceActive) return "Price";
    const min = `$${search.priceMin.toLocaleString()}`;
    if (search.priceMax >= PRICE_MAX) return `${min}+`;
    return `${min} – $${search.priceMax.toLocaleString()}`;
  })();

  const techniqueLabel =
    techniqueList.length === 0
      ? "Fishing Style"
      : techniqueList.length === 1
        ? TECHNIQUE_OPTIONS.find((o) => o.slug === techniqueList[0])?.label ??
          "1 selected"
        : `${techniqueList.length} selected`;

  const speciesLabel =
    speciesList.length === 0
      ? "Target Fish"
      : speciesList.length === 1
        ? SPECIES_OPTIONS.find((o) => o.slug === speciesList[0])?.label ?? "1 selected"
        : `${speciesList.length} selected`;

  const locationLabel = [search.city, search.state].filter(Boolean).join(", ");
  const headerLabel = locationLabel
    ? `${locationLabel}: ${results.length} fishing ${results.length === 1 ? "charter" : "charters"} available`
    : `${results.length} fishing ${results.length === 1 ? "charter" : "charters"} available`;

  return (
    <main className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-6">
      {/* TOP SEARCH BAR */}
      <section className="rounded-2xl border border-border bg-card p-3 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitTopBar();
          }}
          className="grid grid-cols-1 gap-2 md:grid-cols-[1.5fr_1fr_1fr_auto]"
        >
          <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <LocationAutocomplete
              value={cityInput}
              onChangeText={setCityInput}
              onPick={(loc) => {
                setCityInput(loc.address);
                setSearch({
                  city: loc.city ?? "",
                  state: loc.state ?? "",
                  country: loc.country ?? "",
                });
              }}
              onSubmitFreeText={submitTopBar}
              placeholder="City, region, or country"
              ariaLabel="Location"
              leadingIcon={<MapPin className="size-4 text-muted-foreground" />}
              inputClassName="text-sm"
            />
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-muted-foreground">
            <Calendar className="size-4" />
            <input
              type="date"
              value={search.tripDate}
              onChange={(e) => setSearch({ tripDate: e.target.value })}
              className="w-full bg-transparent text-sm text-foreground outline-none"
              aria-label="Trip date"
            />
          </label>

          <Popover>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="flex items-center justify-between gap-2 rounded-xl border border-border bg-background px-3 py-2.5 text-left text-sm"
              >
                <span className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  {search.adults} adult{search.adults === 1 ? "" : "s"} •{" "}
                  {search.children} child{search.children === 1 ? "" : "ren"}
                </span>
                <ChevronDown className="size-4 text-muted-foreground" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-4">
              <Stepper
                label="Adults"
                value={search.adults}
                min={1}
                onChange={(v) => setSearch({ adults: v })}
              />
              <div className="h-3" />
              <Stepper
                label="Children"
                value={search.children}
                min={0}
                onChange={(v) => setSearch({ children: v })}
              />
            </PopoverContent>
          </Popover>

          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-info px-6 py-2.5 text-sm font-semibold text-info-foreground transition-opacity hover:opacity-90"
          >
            <Search className="size-4" />
            Search
          </button>
        </form>
      </section>

      {/* FILTER PILL ROW */}
      <section className="mt-4 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setSearch({ instantBook: !search.instantBook })}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            search.instantBook
              ? "border-info bg-info text-info-foreground"
              : "border-border bg-card text-foreground hover:bg-accent",
          )}
        >
          <Zap className="size-3.5" />
          Instant Book
        </button>

        <PopoverPill
          label={activeCategoryLabel === "All trip types" ? "Trip Type" : activeCategoryLabel}
          active={!!search.category}
        >
          <div className="w-60 p-2">
            <button
              type="button"
              onClick={() => setSearch({ category: "" })}
              className={cn(
                "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                !search.category
                  ? "bg-info/15 font-medium text-info"
                  : "text-foreground hover:bg-accent",
              )}
            >
              All trip types
            </button>
            {FISHING_ENVIRONMENTS.map((env) => (
              <button
                key={env.id}
                type="button"
                onClick={() => setSearch({ category: env.id })}
                className={cn(
                  "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                  search.category === env.id
                    ? "bg-info/15 font-medium text-info"
                    : "text-foreground hover:bg-accent",
                )}
              >
                {env.label}
              </button>
            ))}
          </div>
        </PopoverPill>

        {/* DURATION */}
        <PopoverPill
          label={durationLabel}
          active={!!search.duration}
          onClear={search.duration ? () => setSearch({ duration: "" }) : undefined}
        >
          <div className="w-52 p-2 max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSearch({ duration: "" })}
              className={cn(
                "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                !search.duration
                  ? "bg-info/15 font-medium text-info"
                  : "text-foreground hover:bg-accent",
              )}
            >
              Any duration
            </button>
            {DURATION_BUCKETS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSearch({ duration: opt.value })}
                className={cn(
                  "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                  search.duration === opt.value
                    ? "bg-info/15 font-medium text-info"
                    : "text-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </PopoverPill>

        {/* DEPARTURE TIME */}
        <PopoverPill
          label={departureLabel}
          active={!!search.departureTime}
          onClear={
            search.departureTime ? () => setSearch({ departureTime: "" }) : undefined
          }
        >
          <div className="w-52 p-2 max-h-72 overflow-y-auto">
            <button
              type="button"
              onClick={() => setSearch({ departureTime: "" })}
              className={cn(
                "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                !search.departureTime
                  ? "bg-info/15 font-medium text-info"
                  : "text-foreground hover:bg-accent",
              )}
            >
              Any time
            </button>
            {DEPARTURE_BUCKETS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSearch({ departureTime: opt.value })}
                className={cn(
                  "block w-full rounded-md px-3 py-1.5 text-left text-sm",
                  search.departureTime === opt.value
                    ? "bg-info/15 font-medium text-info"
                    : "text-foreground hover:bg-accent",
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </PopoverPill>

        {/* PRICE */}
        <PopoverPill
          label={priceLabel}
          active={priceActive}
          onClear={
            priceActive
              ? () => setSearch({ priceMin: PRICE_MIN, priceMax: PRICE_MAX })
              : undefined
          }
        >
          <PricePopover
            min={search.priceMin}
            max={search.priceMax}
            onChange={(min, max) => setSearch({ priceMin: min, priceMax: max })}
          />
        </PopoverPill>

        {/* TECHNIQUE */}
        <PopoverPill
          label={techniqueLabel}
          active={techniqueList.length > 0}
          onClear={
            techniqueList.length > 0 ? () => setSearch({ technique: "" }) : undefined
          }
        >
          <CheckboxList
            options={TECHNIQUE_OPTIONS}
            selected={techniqueList}
            onToggle={(slug) => {
              const next = techniqueList.includes(slug)
                ? techniqueList.filter((s) => s !== slug)
                : [...techniqueList, slug];
              setSearch({ technique: listToCsv(next) });
            }}
            onClear={() => setSearch({ technique: "" })}
          />
        </PopoverPill>

        {/* TARGET FISH */}
        <PopoverPill
          label={speciesLabel}
          active={speciesList.length > 0}
          onClear={speciesList.length > 0 ? () => setSearch({ species: "" }) : undefined}
        >
          <CheckboxList
            options={SPECIES_OPTIONS}
            selected={speciesList}
            onToggle={(slug) => {
              const next = speciesList.includes(slug)
                ? speciesList.filter((s) => s !== slug)
                : [...speciesList, slug];
              setSearch({ species: listToCsv(next) });
            }}
            onClear={() => setSearch({ species: "" })}
            searchable
          />
        </PopoverPill>

        {anyTripFilter && (
          <button
            type="button"
            onClick={clearAllTripFilters}
            className="ml-1 text-sm font-medium text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
          >
            Clear all
          </button>
        )}
      </section>

      {/* RESULTS HEADER */}
      <header className="mt-6 mb-4">
        <h1
          className="text-2xl text-foreground md:text-3xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          {liveQuery.isLoading ? "Searching…" : headerLabel}
        </h1>
      </header>

      {/* RESULTS GRID */}
      {liveQuery.isLoading ? (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <li
              key={i}
              className="aspect-[16/12] animate-pulse rounded-2xl border border-border bg-muted/40"
            />
          ))}
        </ul>
      ) : results.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-sm text-muted-foreground">
          No charters match your search. Try clearing the city or category filter.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((op) => (
            <OperatorCard key={op.id} operator={op} />
          ))}
        </ul>
      )}
    </main>
  );
}

function PopoverPill({
  label,
  active,
  onClear,
  children,
}: {
  label: string;
  active?: boolean;
  onClear?: () => void;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
            active
              ? "border-info bg-info text-info-foreground"
              : "border-border bg-card text-foreground hover:bg-accent",
          )}
        >
          {label}
          {active && onClear ? (
            <span
              role="button"
              aria-label={`Clear ${label}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onClear();
              }}
              className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full hover:bg-info-foreground/20"
            >
              <X className="size-3" />
            </span>
          ) : (
            <ChevronDown className="size-3.5" />
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        {children}
      </PopoverContent>
    </Popover>
  );
}

function PricePopover({
  min,
  max,
  onChange,
}: {
  min: number;
  max: number;
  onChange: (min: number, max: number) => void;
}) {
  const [local, setLocal] = useState<[number, number]>([min, max]);
  // Sync local state when upstream URL state changes (e.g. external Clear).
  useEffect(() => {
    setLocal([min, max]);
  }, [min, max]);

  function commit(next: [number, number]) {
    setLocal(next);
    onChange(next[0], next[1]);
  }

  return (
    <div className="w-72 p-4">
      <div className="mb-3 grid grid-cols-2 gap-2">
        {PRICE_PRESETS.map((preset) => {
          const active = min === preset.min && max === preset.max;
          return (
            <button
              key={preset.id}
              type="button"
              onClick={() => commit([preset.min, preset.max])}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
                active
                  ? "border-info bg-info text-info-foreground"
                  : "border-border bg-card text-foreground hover:bg-accent",
              )}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <Slider
        value={local}
        min={PRICE_MIN}
        max={PRICE_MAX}
        step={PRICE_STEP}
        minStepsBetweenThumbs={1}
        onValueChange={(v) => setLocal([v[0], v[1]] as [number, number])}
        onValueCommit={(v) => commit([v[0], v[1]] as [number, number])}
        className="my-4"
      />
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <span>${local[0].toLocaleString()}</span>
        <span>
          ${local[1].toLocaleString()}
          {local[1] >= PRICE_MAX ? "+" : ""}
        </span>
      </div>
    </div>
  );
}




function CheckboxList({
  options,
  selected,
  onToggle,
  onClear,
  searchable,
}: {
  options: { slug: string; label: string }[];
  selected: string[];
  onToggle: (slug: string) => void;
  onClear: () => void;
  searchable?: boolean;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!searchable || !q.trim()) return options;
    const needle = q.trim().toLowerCase();
    return options.filter((o) => o.label.toLowerCase().includes(needle));
  }, [options, q, searchable]);

  return (
    <div className="w-64 p-2">
      {searchable && (
        <input
          type="text"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search species…"
          className="mb-2 w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-sm outline-none focus:border-info"
        />
      )}
      <ul className="max-h-64 overflow-y-auto">
        {filtered.map((opt) => {
          const checked = selected.includes(opt.slug);
          return (
            <li key={opt.slug}>
              <label className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-accent">
                <Checkbox
                  checked={checked}
                  onCheckedChange={() => onToggle(opt.slug)}
                />
                <span className="text-sm text-foreground">{opt.label}</span>
              </label>
            </li>
          );
        })}
        {filtered.length === 0 && (
          <li className="px-2 py-3 text-center text-xs text-muted-foreground">
            No matches
          </li>
        )}
      </ul>
      {selected.length > 0 && (
        <button
          type="button"
          onClick={onClear}
          className="mt-2 w-full rounded-md border border-border px-2 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent"
        >
          Clear selection
        </button>
      )}
    </div>
  );
}

function Stepper({
  label,
  value,
  min,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm font-medium text-foreground">{label}</span>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex size-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center text-sm tabular-nums">{value}</span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex size-7 items-center justify-center rounded-full border border-border text-foreground hover:bg-accent"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </div>
  );
}
