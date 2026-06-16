import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  archiveListing,
  hardDeleteListing,
  listAdminListings,
  restoreListing,
  setListingFeatured,
  setListingModeration,
  setListingPriority,
} from "@/lib/admin-listings.functions";
import { cn } from "@/lib/utils";
import { Switch } from "@/components/ui/switch";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { Eye, Archive, RotateCcw, Trash2 } from "lucide-react";

export const Route = createFileRoute("/_admin/admin/listings")({
  component: ListingsPage,
});

const FILTERS = ["pending", "approved", "declined", "all", "archived"] as const;

type Filter = (typeof FILTERS)[number];
type Moderation = "pending" | "approved" | "declined";
type SortBy = "priority" | "newest" | "oldest";

const APPROVED_GREEN = DESIGN_SYSTEM.colors.leafGreen;
const PENDING_YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;

function statusLabel(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function statusStyle(s: string): React.CSSProperties {
  if (s === "approved") return { color: APPROVED_GREEN };
  if (s === "pending") return { color: PENDING_YELLOW };
  return {};
}

type ListingRow = Awaited<ReturnType<typeof listAdminListings>>[number];

function ListingsPage() {
  const [filter, setFilter] = useState<Filter>("all");
  const [titleQ, setTitleQ] = useState("");
  const [aideQ, setAideQ] = useState("");
  const [listingNumQ, setListingNumQ] = useState("");
  const [categoryQ, setCategoryQ] = useState<string>("all");
  const [featuredQ, setFeaturedQ] = useState<"all" | "featured">("all");
  const [sortBy, setSortBy] = useState<SortBy>("priority");
  const filtersDirty =
    titleQ !== "" ||
    aideQ !== "" ||
    listingNumQ !== "" ||
    categoryQ !== "all" ||
    featuredQ !== "all" ||
    sortBy !== "priority";
  const clearFilters = () => {
    setTitleQ("");
    setAideQ("");
    setListingNumQ("");
    setCategoryQ("all");
    setFeaturedQ("all");
    setSortBy("priority");
  };

  const fetchListings = useServerFn(listAdminListings);
  const setFeaturedFn = useServerFn(setListingFeatured);
  const setModerationFn = useServerFn(setListingModeration);
  const setPriorityFn = useServerFn(setListingPriority);
  const archiveFn = useServerFn(archiveListing);
  const restoreFn = useServerFn(restoreListing);
  const hardDeleteFn = useServerFn(hardDeleteListing);
  const qc = useQueryClient();

  const queryKey = ["admin", "listings", filter] as const;
  const { data, isLoading } = useQuery({
    queryKey,
    queryFn: () => fetchListings({ data: { moderation: filter } }),
  });

  const featureMut = useMutation({
    mutationFn: (vars: { journeyId: string; featured: boolean }) =>
      setFeaturedFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListingRow[]>(queryKey);
      qc.setQueryData<ListingRow[]>(queryKey, (old: ListingRow[] | undefined) =>
        (old ?? []).map((r) =>
          r.id === vars.journeyId ? { ...r, featured: vars.featured } : r,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Could not update featured flag");
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["admin", "listings"] }),
  });

  const priorityMut = useMutation({
    mutationFn: (vars: { journeyId: string; priority: number }) =>
      setPriorityFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListingRow[]>(queryKey);
      qc.setQueryData<ListingRow[]>(queryKey, (old: ListingRow[] | undefined) =>
        (old ?? []).map((r) =>
          r.id === vars.journeyId ? { ...r, priority_order: vars.priority } : r,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Could not save priority");
    },
    onSuccess: () => {
      toast.success("Priority saved");
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
    },
  });

  const archiveMut = useMutation({
    mutationFn: (journeyId: string) => archiveFn({ data: { journeyId } }),
    onSuccess: () => {
      toast.success("Listing archived");
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
      qc.invalidateQueries({ queryKey: ["admin", "queue", "listings"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not archive listing"),
  });

  const restoreMut = useMutation({
    mutationFn: (journeyId: string) => restoreFn({ data: { journeyId } }),
    onSuccess: () => {
      toast.success("Listing restored — back in the moderation queue as Pending.");
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
      qc.invalidateQueries({ queryKey: ["admin", "queue", "listings"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not restore listing"),
  });

  const hardDeleteMut = useMutation({
    mutationFn: (journeyId: string) => hardDeleteFn({ data: { journeyId } }),
    onSuccess: () => {
      toast.success("Listing permanently deleted");
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
    },
    onError: (err) =>
      toast.error(err instanceof Error ? err.message : "Could not permanently delete listing"),
  });

  const moderationMut = useMutation({
    mutationFn: (vars: { journeyId: string; moderation: Moderation }) =>
      setModerationFn({ data: vars }),
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<ListingRow[]>(queryKey);
      qc.setQueryData<ListingRow[]>(queryKey, (old: ListingRow[] | undefined) =>
        (old ?? []).map((r) =>
          r.id === vars.journeyId ? { ...r, moderation_status: vars.moderation } : r,
        ),
      );
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
      toast.error(err instanceof Error ? err.message : "Could not update status");
    },
    onSuccess: (_d, vars) => {
      toast.success(
        vars.moderation === "approved"
          ? "Listing approved — it's now live."
          : `Listing set to ${vars.moderation}.`,
      );
      qc.invalidateQueries({ queryKey: ["admin", "listings"] });
    },
  });

  const categories = useMemo(() => {
    const set = new Set<string>();
    for (const r of data ?? []) if (r.category) set.add(r.category);
    return Array.from(set).sort();
  }, [data]);

  const rows = useMemo(() => {
    const all = (data ?? []).filter((r) => {
      if (titleQ && !r.title.toLowerCase().includes(titleQ.toLowerCase())) return false;
      if (aideQ) {
        const aide = `${r.mentor_name ?? ""} ${r.mentor_email ?? ""}`.toLowerCase();
        if (!aide.includes(aideQ.toLowerCase())) return false;
      }
      if (
        listingNumQ &&
        !(r.course_id_slug ?? "").toLowerCase().includes(listingNumQ.toLowerCase())
      )
        return false;
      if (categoryQ !== "all" && (r.category ?? "") !== categoryQ) return false;
      if (featuredQ === "featured" && !r.featured) return false;
      return true;
    });
    const sorted = [...all];
    if (sortBy === "priority") {
      sorted.sort((a, b) => {
        const ap = a.priority_order ?? 0;
        const bp = b.priority_order ?? 0;
        if (bp !== ap) return bp - ap;
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      });
    } else if (sortBy === "newest") {
      sorted.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    } else {
      sorted.sort(
        (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
      );
    }
    return sorted;
  }, [data, titleQ, aideQ, listingNumQ, categoryQ, featuredQ, sortBy]);

  const confirmArchive = (id: string, label: string) => {
    if (
      window.confirm(
        `Archive "${label}"? It will move to the Archived tab and disappear from active queues.`,
      )
    ) {
      archiveMut.mutate(id);
    }
  };

  const confirmRestore = (id: string, label: string) => {
    if (
      window.confirm(
        `Restore "${label}"? It will return to the moderation queue as Pending.`,
      )
    ) {
      restoreMut.mutate(id);
    }
  };

  const confirmHardDelete = (id: string) => {
    if (
      window.confirm(
        "Are you sure you want to permanently vaporize this spam/garbage from the database? This cannot be undone.",
      )
    ) {
      hardDeleteMut.mutate(id);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium capitalize transition",
              filter === f
                ? "border-transparent bg-foreground text-background"
                : "border-border bg-white text-muted-foreground hover:text-foreground",
            )}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-white p-3">
        <input
          type="text"
          value={listingNumQ}
          onChange={(e) => setListingNumQ(e.target.value)}
          placeholder="Search by listing #…"
          className="w-44 rounded-md border border-border bg-white px-3 py-1.5 text-xs"
        />
        <input
          type="text"
          value={titleQ}
          onChange={(e) => setTitleQ(e.target.value)}
          placeholder="Search by title…"
          className="w-48 rounded-md border border-border bg-white px-3 py-1.5 text-xs"
        />
        <input
          type="text"
          value={aideQ}
          onChange={(e) => setAideQ(e.target.value)}
          placeholder="Search by aide (name or email)…"
          className="w-56 rounded-md border border-border bg-white px-3 py-1.5 text-xs"
        />
        <select
          value={categoryQ}
          onChange={(e) => setCategoryQ(e.target.value)}
          className="min-w-[140px] rounded-md border border-border bg-white px-3 py-1.5 text-xs"
        >
          <option value="all">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={featuredQ}
          onChange={(e) => setFeaturedQ(e.target.value as "all" | "featured")}
          className="min-w-[140px] rounded-md border border-border bg-white px-3 py-1.5 text-xs"
        >
          <option value="all">All listings</option>
          <option value="featured">Featured only</option>
        </select>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as SortBy)}
          className="min-w-[180px] rounded-md border border-border bg-white px-3 py-1.5 text-xs"
          title="Sort listings"
        >
          <option value="priority">Sort: Priority (high → low)</option>
          <option value="newest">Sort: Newest first</option>
          <option value="oldest">Sort: Oldest first</option>
        </select>
        {filtersDirty && (
          <button
            type="button"
            onClick={clearFilters}
            className="ml-auto rounded-md border border-border bg-white px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            Clear search
          </button>
        )}
      </div>

      <div className="overflow-x-auto rounded-lg border bg-white">
        <table className="w-full text-xs">
          <thead className="border-b bg-muted/30">
            <tr className="text-left text-[11px] uppercase tracking-wide text-lime-500">
              <th className="px-2 py-2 font-semibold">Priority</th>
              <th className="px-2 py-2 font-semibold">Listing #</th>
              <th className="px-2 py-2 font-semibold">Listing</th>
              <th className="px-2 py-2 font-semibold">Category</th>
              <th className="px-2 py-2 font-semibold">Aide (User)</th>
              <th className="px-2 py-2 font-semibold">Status</th>
              <th className="px-2 py-2 font-semibold">Stripe Payout Status</th>
              <th className="px-2 py-2 font-semibold">Featured</th>
              <th className="px-2 py-2 text-right font-semibold">Manage</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">
                  Loading…
                </td>
              </tr>
            )}
            {!isLoading && rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-2 py-4 text-center text-muted-foreground">
                  No listings.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <ListingRowView
                key={row.id}
                row={row}
                isArchivedTab={filter === "archived"}
                onModerationToggle={(next) =>
                  moderationMut.mutate({ journeyId: row.id, moderation: next })
                }
                moderationPending={moderationMut.isPending}
                onFeatured={(v) =>
                  featureMut.mutate({ journeyId: row.id, featured: v })
                }
                onPriorityChange={(p) =>
                  priorityMut.mutate({ journeyId: row.id, priority: p })
                }
                onArchive={() => confirmArchive(row.id, row.title)}
                onRestore={() => confirmRestore(row.id, row.title)}
                onHardDelete={() => confirmHardDelete(row.id)}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function ListingRowView({
  row,
  isArchivedTab,
  onModerationToggle,
  moderationPending,
  onFeatured,
  onPriorityChange,
  onArchive,
  onRestore,
  onHardDelete,
}: {
  row: ListingRow;
  isArchivedTab: boolean;
  onModerationToggle: (next: Moderation) => void;
  moderationPending: boolean;
  onFeatured: (v: boolean) => void;
  onPriorityChange: (p: number) => void;
  onArchive: () => void;
  onRestore: () => void;
  onHardDelete: () => void;
}) {
  const aide = row.mentor_name || row.mentor_email || "—";
  const slug = row.slug ?? "";
  const cover = (row as { cover_image_url?: string | null }).cover_image_url;

  const initial = (row.priority_order ?? 0).toString();
  const [priorityInput, setPriorityInput] = useState(initial);
  useEffect(() => {
    setPriorityInput((row.priority_order ?? 0).toString());
  }, [row.priority_order]);

  const commit = () => {
    const parsed = parseInt(priorityInput, 10);
    if (Number.isNaN(parsed)) {
      setPriorityInput((row.priority_order ?? 0).toString());
      return;
    }
    const clamped = Math.max(-1000, Math.min(1000, parsed));
    if (clamped !== (row.priority_order ?? 0)) onPriorityChange(clamped);
    setPriorityInput(clamped.toString());
  };

  return (
    <tr className="border-b border-border/60 hover:bg-muted/30">
      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={priorityInput}
            onChange={(e) => setPriorityInput(e.target.value)}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
            }}
            aria-label="Priority"
            title="Higher values appear first on Featured and Search. Saves on blur or Enter."
            className="w-16 rounded-md border border-border bg-white px-2 py-1 text-center text-xs tabular-nums focus:border-lime-400 focus:outline-none"
          />
          <div
            className="group relative h-10 w-10 shrink-0"
            title={`Created: ${new Date(row.created_at).toLocaleDateString()}`}
          >
            <div className="h-10 w-10 overflow-hidden rounded-md bg-muted">
              {cover ? (
                <img
                  src={cover}
                  alt=""
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center">
                  <span className="text-[10px] text-muted-foreground/50">—</span>
                </div>
              )}
            </div>
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background shadow-lg">
                {new Date(row.created_at).toLocaleDateString()}
              </div>
            </div>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 font-mono text-muted-foreground">
        {row.course_id_slug}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        <div className="max-w-[280px] truncate">
          <span className="font-semibold">{row.title}</span>
        </div>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
        {row.category ?? "—"}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-muted-foreground">
        <Link
          to="/admin/users/$userId"
          params={{ userId: row.mentor_id }}
          className="hover:text-lime-500 hover:underline"
        >
          {aide}
        </Link>
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        {row.moderation_status === "declined" ? (
          <span className="font-medium text-red-600">
            {statusLabel(row.moderation_status)}
          </span>
        ) : !row.mentor_is_payout_ready && row.moderation_status !== "approved" ? (
          <span
            className="cursor-not-allowed rounded-md font-medium text-muted-foreground/60"
            title="Cannot approve—Aide has not connected a payout account."
          >
            {statusLabel(row.moderation_status)}
          </span>
        ) : (
          <button
            type="button"
            onClick={() =>
              onModerationToggle(
                row.moderation_status === "approved" ? "pending" : "approved",
              )
            }
            disabled={moderationPending}
            title={
              row.moderation_status === "pending"
                ? "Click to approve"
                : "Click to revert to pending"
            }
            className="rounded-md font-medium transition hover:underline disabled:opacity-50"
            style={statusStyle(row.moderation_status)}
          >
            {statusLabel(row.moderation_status)}
          </button>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        {row.mentor_is_payout_ready ? (
          <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-medium text-emerald-800">
            🟩 Connected
          </span>
        ) : (
          <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-medium text-amber-800">
            🟨 Missing Stripe Setup
          </span>
        )}
      </td>
      <td className="whitespace-nowrap px-2 py-1.5">
        <Switch checked={!!row.featured} onCheckedChange={onFeatured} />
      </td>
      <td className="whitespace-nowrap px-2 py-1.5 text-right">
        {isArchivedTab ? (
          <span className="inline-flex items-center justify-end gap-1">
            <button
              onClick={onRestore}
              className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100"
              aria-label="Restore"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Restore
              </span>
            </button>
            <button
              onClick={onHardDelete}
              className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md bg-red-600 text-white hover:bg-red-700"
              aria-label="Permanently Delete"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Permanently Delete
              </span>
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center justify-end gap-1">
            {slug ? (
              <Link
                to="/p/$pathSlug"
                params={{ pathSlug: slug }}
                search={{ admin: 1 as const }}
                className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md text-lime-500 hover:bg-lime-50 hover:text-lime-600"
                aria-label="View Listing"
              >
                <Eye className="h-4 w-4" />
                <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                  View Listing
                </span>
              </Link>
            ) : (
              <span
                className="inline-flex h-7 w-7 items-center justify-center rounded-md text-muted-foreground/40"
                aria-label="View unavailable"
              >
                <Eye className="h-4 w-4" />
              </span>
            )}
            <button
              onClick={onArchive}
              className="group relative inline-flex h-7 w-7 items-center justify-center rounded-md text-red-600 hover:bg-red-50 hover:text-red-700"
              aria-label="Archive"
            >
              <Archive className="h-4 w-4" />
              <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1 -translate-x-1/2 whitespace-nowrap rounded-md bg-foreground px-2 py-1 text-[10px] text-background opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
                Archive
              </span>
            </button>
          </span>
        )}
      </td>
    </tr>
  );
}
