import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { Search, X, SlidersHorizontal } from "lucide-react";
import { z } from "zod";
import { fallback, zodValidator } from "@tanstack/zod-adapter";
import { LiveJourneyCard } from "@/components/listings/LiveJourneyCard";
import { listCategories, type CategoryRow } from "@/lib/categories.functions";
import { DESIGN_SYSTEM } from "@/lib/brand";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { searchJourneysServer, type JourneyRow } from "@/lib/journeys.functions";
import { TagSuggestInput } from "@/components/search/TagSuggestInput";
import { cn } from "@/lib/utils";

const searchSchema = z.object({
  q: fallback(z.string(), "").default(""),
  category: fallback(z.string(), "").default(""),
  subcategory: fallback(z.string(), "").default(""),
  level: fallback(
    z.enum(["beginner", "intermediate", "advanced", ""]),
    "",
  ).default(""),
  empty: fallback(z.boolean(), false).default(false),
});

const LEVEL_LABELS: Record<"beginner" | "intermediate" | "advanced", string> = {
  beginner: "Fresh Squeezed (Beginner)",
  intermediate: "Zesty (Intermediate)",
  advanced: "Tart (Advanced)",
};

export const Route = createFileRoute("/search")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Browse Aide-Led AI Courses — Lemonaidely" },
      {
        name: "description",
        content:
          "Browse live, Aide-guided AI Courses by category — find the Course that matches what you want to master.",
      },
      { property: "og:title", content: "Browse Aide-Led AI Courses — Lemonaidely" },
      {
        property: "og:description",
        content:
          "Browse live, Aide-guided AI Courses by category — find the Course that matches what you want to master.",
      },
      { property: "og:url", content: "https://lemonaidely.com/search" },
    ],
    links: [{ rel: "canonical", href: "https://lemonaidely.com/search" }],
  }),
  component: SearchPage,
});

function SearchPage() {
  const navigate = useNavigate();
  const { q, category, subcategory, level, empty } = Route.useSearch();

  const searchFn = useServerFn(searchJourneysServer);
  const liveQuery = useQuery({
    queryKey: ["search-journeys", q, category, subcategory, level],
    queryFn: () => searchFn({ data: { q, category, subcategory } }),
  });

  const allResults: JourneyRow[] = liveQuery.data?.items ?? [];
  const liveResults: JourneyRow[] = level
    ? allResults.filter(
        (j) => (j.experience_level ?? "").toLowerCase() === level,
      )
    : allResults;

  const fetchCategories = useServerFn(listCategories);
  const categoriesQuery = useQuery({
    queryKey: ["categories"],
    queryFn: () => fetchCategories(),
  });
  const allCats: CategoryRow[] = categoriesQuery.data ?? [];
  const parentCats = allCats.filter((c) => c.parent_id === null);
  const childrenByParent = new Map<string, CategoryRow[]>();
  for (const c of allCats) {
    if (c.parent_id) {
      const arr = childrenByParent.get(c.parent_id) ?? [];
      arr.push(c);
      childrenByParent.set(c.parent_id, arr);
    }
  }

  function setSearch(
    next: Partial<{
      q: string;
      category: string;
      subcategory: string;
      level: "" | "beginner" | "intermediate" | "advanced";
      empty: boolean;
    }>,
  ) {
    navigate({
      to: "/search",
      search: (prev: {
        q?: string;
        category?: string;
        subcategory?: string;
        level?: "" | "beginner" | "intermediate" | "advanced";
        empty?: boolean;
      }) => ({
        q: prev.q ?? "",
        category: prev.category ?? "",
        subcategory: prev.subcategory ?? "",
        level: prev.level ?? "",
        empty: prev.empty ?? false,
        ...next,
      }),
      replace: true,
    });
  }

  const sidebar = (
    <div className="space-y-4">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground" />
        <TagSuggestInput
          value={q}
          onChange={(v) => setSearch({ q: v })}
          onSubmit={(v) => setSearch({ q: v })}
          placeholder="Search courses…"
          ariaLabel="Search courses"
          inputClassName="w-full rounded-full border border-border bg-card py-2.5 pl-10 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30"
        />
      </div>

      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Experience Level
          </h2>
          {level && (
            <button
              type="button"
              onClick={() => setSearch({ level: "" })}
              className="text-xs font-medium text-info hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <Accordion type="single" collapsible className="w-full">
          <AccordionItem value="experience-level" className="border-b-0">
            <AccordionTrigger
              className={cn(
                "rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:no-underline",
                level && "text-info",
              )}
            >
              {level
                ? LEVEL_LABELS[level as "beginner" | "intermediate" | "advanced"]
                : "All Levels"}
            </AccordionTrigger>
            <AccordionContent className="pb-1 pl-3">
              <button
                type="button"
                onClick={() => setSearch({ level: "" })}
                className={cn(
                  "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                  !level
                    ? "bg-info/15 font-medium text-info"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                All Levels
              </button>
              {(["beginner", "intermediate", "advanced"] as const).map((lv) => (
                <button
                  key={lv}
                  type="button"
                  onClick={() => setSearch({ level: lv })}
                  className={cn(
                    "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                    level === lv
                      ? "bg-info/15 font-medium text-info"
                      : "text-muted-foreground hover:bg-accent hover:text-foreground",
                  )}
                >
                  {LEVEL_LABELS[lv]}
                </button>
              ))}
            </AccordionContent>
          </AccordionItem>
        </Accordion>
      </div>


      <div className="space-y-1">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Categories
          </h2>
          {(category || subcategory) && (
            <button
              type="button"
              onClick={() => setSearch({ category: "", subcategory: "" })}
              className="text-xs font-medium text-info hover:underline"
            >
              Clear
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setSearch({ category: "", subcategory: "" })}
          className={cn(
            "block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
            !category
              ? "bg-info text-info-foreground"
              : "text-foreground hover:bg-accent",
          )}
        >
          All Categories
        </button>

        <Accordion type="multiple" className="w-full">
          {parentCats.map((parent) => {
            const kids = childrenByParent.get(parent.id) ?? [];
            if (kids.length === 0) {
              return (
                <button
                  key={parent.id}
                  type="button"
                  onClick={() =>
                    setSearch({ category: parent.name, subcategory: "" })
                  }
                  className={cn(
                    "block w-full rounded-md px-3 py-2 text-left text-sm font-medium transition-colors",
                    category === parent.name && !subcategory
                      ? "bg-info text-info-foreground"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  {parent.name}
                </button>
              );
            }
            return (
              <AccordionItem
                key={parent.id}
                value={parent.id}
                className="border-b-0"
              >
                <AccordionTrigger
                  className={cn(
                    "rounded-md px-3 py-2 text-sm font-medium hover:bg-accent hover:no-underline",
                    category === parent.name && "text-info",
                  )}
                >
                  {parent.name}
                </AccordionTrigger>
                <AccordionContent className="pb-1 pl-3">
                  <button
                    type="button"
                    onClick={() =>
                      setSearch({ category: parent.name, subcategory: "" })
                    }
                    className={cn(
                      "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                      category === parent.name && !subcategory
                        ? "bg-info/15 font-medium text-info"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                    )}
                  >
                    All {parent.name}
                  </button>
                  {kids.map((kid) => (
                    <button
                      key={kid.id}
                      type="button"
                      onClick={() =>
                        setSearch({
                          category: parent.name,
                          subcategory: kid.name,
                        })
                      }
                      className={cn(
                        "block w-full rounded-md px-3 py-1.5 text-left text-sm transition-colors",
                        subcategory === kid.name
                          ? "bg-info/15 font-medium text-info"
                          : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      )}
                    >
                      {kid.name}
                    </button>
                  ))}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </div>
    </div>
  );

  return (
    <main className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      <header className="mb-6">
        <h1
          className="text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Explore Courses
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {liveQuery.isLoading
            ? "Searching…"
            : `Showing ${liveResults.length} ${liveResults.length === 1 ? "Course" : "Courses"}${q ? ` for "${q}"` : ""}`}
        </p>
      </header>

      {level && (
        <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/15 px-3 py-1 text-xs font-medium text-foreground">
          <span>
            Level:{" "}
            {LEVEL_LABELS[level as "beginner" | "intermediate" | "advanced"]}
          </span>
          <button
            type="button"
            onClick={() => setSearch({ level: "" })}
            className="hover:text-primary"
            aria-label="Clear level filter"
          >
            <X className="size-3" />
          </button>
        </div>
      )}

      <div className="grid grid-cols-12 gap-6">
        {/* Sidebar */}
        <aside className="col-span-12 lg:col-span-3">
          {/* Mobile: collapsible */}
          <details className="lg:hidden rounded-2xl border border-border bg-card p-4">
            <summary className="flex cursor-pointer items-center gap-2 text-sm font-semibold text-foreground">
              <SlidersHorizontal className="size-4" />
              Search & Filters
            </summary>
            <div className="mt-4">{sidebar}</div>
          </details>
          {/* Desktop: sticky */}
          <div className="hidden lg:block lg:sticky lg:top-24">{sidebar}</div>
        </aside>

        {/* Results */}
        <section id="search-results" className="col-span-12 lg:col-span-9">
          {empty && (
            <div className="mb-6 flex items-start gap-4 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 sm:p-5">
              <div className="flex-1">
                <p className="text-sm font-semibold text-foreground">
                  You haven't placed any orders yet.
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Ready to start learning? Browse our AI courses below.
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setSearch({ empty: false });
                    document
                      .getElementById("search-results")
                      ?.scrollIntoView({ behavior: "smooth", block: "start" });
                  }}
                  className="mt-3 inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                  style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
                >
                  Browse Courses
                </button>
              </div>
              <button
                type="button"
                aria-label="Dismiss"
                onClick={() => setSearch({ empty: false })}
                className="rounded-full p-1 text-muted-foreground transition-colors hover:bg-emerald-100"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
          {liveQuery.isLoading ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="aspect-[16/10] animate-pulse rounded-2xl border border-border bg-muted/40"
                />
              ))}
            </div>
          ) : liveResults.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-8 text-center text-sm text-muted-foreground">
              Mission not found! Try a different keyword or category.{" "}
              <Link to="/" className="text-info hover:underline">
                Back home
              </Link>
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {liveResults.map((j) => (
                <LiveJourneyCard key={j.id} journey={j} />
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}
