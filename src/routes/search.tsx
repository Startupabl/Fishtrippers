import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import {
  Search,
  MapPin,
  Calendar,
  Users,
  SlidersHorizontal,
  ArrowUpDown,
  Zap,
  ChevronDown,
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
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  city: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  instantBook: fallback(z.boolean(), false).default(false),
  tripDate: fallback(z.string(), "").default(""),
  adults: fallback(z.number().int().min(1).max(20), 2).default(2),
  children: fallback(z.number().int().min(0).max(20), 0).default(0),
  duration: fallback(z.string(), "").default(""),
  priceRange: fallback(z.string(), "").default(""),
  departureTime: fallback(z.string(), "").default(""),
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

  // Local input state for city — only commit to URL on Search click / Enter
  const [cityInput, setCityInput] = useState(search.city);
  const [qInput, setQInput] = useState(search.q);

  const searchFn = useServerFn(searchOperatorsServer);
  const liveQuery = useQuery({
    queryKey: [
      "search-operators",
      search.q,
      search.city,
      search.category,
      search.instantBook,
    ],
    queryFn: () =>
      searchFn({
        data: {
          q: search.q || null,
          city: search.city || null,
          category: search.category || null,
          instantBook: search.instantBook || null,
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
    setSearch({ city: cityInput, q: qInput });
  }

  const activeCategoryLabel =
    FISHING_ENVIRONMENTS.find((e) => e.id === search.category)?.label ??
    "All categories";

  const headerLabel = search.city
    ? `${search.city}: ${results.length} fishing ${results.length === 1 ? "charter" : "charters"} available`
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
          <label className="flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2.5">
            <MapPin className="size-4 text-muted-foreground" />
            <input
              type="text"
              value={cityInput}
              onChange={(e) => setCityInput(e.target.value)}
              placeholder="City (e.g. San Francisco)"
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              aria-label="City"
            />
          </label>

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
        <FilterPill label="Sort by Recommended" icon={<ArrowUpDown className="size-3.5" />} disabled />
        <FilterPill label="Filters" icon={<SlidersHorizontal className="size-3.5" />} disabled />

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
          label={activeCategoryLabel === "All categories" ? "Category" : activeCategoryLabel}
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
              All categories
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

        <FilterPill label="Duration" comingSoon />
        <FilterPill label="Price Range" comingSoon />
        <FilterPill label="Departure Time" comingSoon />
        <FilterPill label="Fishing Technique" comingSoon />
        <FilterPill label="Target Fish" comingSoon />
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

function FilterPill({
  label,
  icon,
  disabled,
  comingSoon,
}: {
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  comingSoon?: boolean;
}) {
  if (comingSoon) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent"
          >
            {label}
            <ChevronDown className="size-3.5 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-3 text-sm text-muted-foreground">
          Coming soon — this filter is still being wired up.
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <button
      type="button"
      disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3.5 py-1.5 text-sm font-medium text-foreground hover:bg-accent disabled:cursor-default disabled:opacity-90"
    >
      {icon}
      {label}
      {!icon && <ChevronDown className="size-3.5 text-muted-foreground" />}
    </button>
  );
}

function PopoverPill({
  label,
  active,
  children,
}: {
  label: string;
  active?: boolean;
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
          <ChevronDown className="size-3.5" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-0">
        {children}
      </PopoverContent>
    </Popover>
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
