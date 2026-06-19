import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  ArrowLeft,
  MoreHorizontal,
  Plus,
  Trash2,
  GitMerge,
  Pencil,
  Check,
  ArrowRightLeft,
  Lightbulb,
} from "lucide-react";

import {
  createTag,
  deleteTag,
  listTags,
  mergeTags,
  updateTag,
  listUnknownTags,
  approveSuggestion,
  redirectSuggestion,
} from "@/lib/tags.functions";
import { listCategories, type CategoryRow } from "@/lib/categories.functions";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export const Route = createFileRoute("/_admin/admin/search-seo/tags")({
  component: TagManagerPage,
});

type TagRow = {
  id: string;
  name: string;
  is_public: boolean;
  category_ids: string[];
  category_names: string[];
};

type Suggestion = { name: string; usage_count: number };

function useParentCategories(): CategoryRow[] {
  const listCatsFn = useServerFn(listCategories);
  const { data } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => listCatsFn(),
    staleTime: 5 * 60 * 1000,
  });
  return useMemo(
    () =>
      (data ?? [])
        .filter((c) => c.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [data],
  );
}

function TagManagerPage() {
  const [tab, setTab] = useState<"master" | "suggestions">("master");
  const listSuggestionsFn = useServerFn(listUnknownTags);
  const suggestionsQuery = useQuery({
    queryKey: ["admin", "tag-suggestions"],
    queryFn: () => listSuggestionsFn(),
    retry: false,
  });
  const suggestionCount = suggestionsQuery.data?.suggestions.length ?? 0;

  return (
    <div>
      <div className="mb-4 flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link to="/admin/search-seo">
            <ArrowLeft className="size-4" /> Back
          </Link>
        </Button>
      </div>

      <Accordion type="single" collapsible defaultValue="" className="mb-6">
        <AccordionItem
          value="how-it-works"
          className="rounded-xl border bg-slate-50/70 px-4 dark:bg-slate-900/30"
        >
          <AccordionTrigger className="text-left hover:no-underline">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <Lightbulb className="size-4 text-amber-500" />
              How It Works: Tag Management System (Click to expand)
            </div>
          </AccordionTrigger>
          <AccordionContent>
            <div className="grid grid-cols-1 gap-6 pb-2 pt-2 md:grid-cols-3">
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  1. Captains/Guides Create Tags Live
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  When captains/guides build or edit a listing, they use a smart autocomplete bar
                  powered by your master dictionary. If they type something brand new, the
                  system lets them add it instantly as a Custom Tag so their creation flow
                  never gets blocked.
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  2. Multi-Layer SEO & Search Activation
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  The moment a tag is saved to a listing, it automatically fuels three
                  critical areas: Marketplace Search (expands internal search power),
                  On-Page Visuals (renders as clickable keyword pills), and Google Meta Tags
                  (injects directly into the page's HTML code).
                </p>
              </div>
              <div className="space-y-2">
                <h4 className="text-sm font-semibold text-foreground">
                  3. Complete Executive Control
                </h4>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  Tags can belong to multiple main categories at once. Custom user tags
                  land in your "User Suggestions" queue where you can approve them into
                  one or more categories, or merge them into an existing master tag to
                  clean up duplicates across every listing in one click.
                </p>
              </div>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      <Tabs value={tab} onValueChange={(v) => setTab(v as typeof tab)}>
        <TabsList>
          <TabsTrigger value="master">Master Dictionary</TabsTrigger>
          <TabsTrigger value="suggestions" className="gap-2">
            User Suggestions
            {suggestionCount > 0 && (
              <Badge variant="secondary" className="h-5 px-1.5">
                {suggestionCount}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="master" className="mt-6">
          <MasterDictionaryTab />
        </TabsContent>
        <TabsContent value="suggestions" className="mt-6">
          <SuggestionsTab
            data={suggestionsQuery.data?.suggestions ?? []}
            isLoading={suggestionsQuery.isLoading}
            isError={suggestionsQuery.isError}
            error={suggestionsQuery.error as Error | null}
            refetch={() => suggestionsQuery.refetch()}
            isFetching={suggestionsQuery.isFetching}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function MasterDictionaryTab() {
  const list = useServerFn(listTags);
  const create = useServerFn(createTag);
  const update = useServerFn(updateTag);
  const remove = useServerFn(deleteTag);
  const merge = useServerFn(mergeTags);
  const qc = useQueryClient();
  const parentCategories = useParentCategories();

  const { data, isLoading, isError, error, refetch, isFetching } = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: () => list(),
    retry: false,
  });
  const tags: TagRow[] = (data?.tags ?? []) as TagRow[];

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [filterCategoryId, setFilterCategoryId] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [createOpen, setCreateOpen] = useState(false);
  const [editing, setEditing] = useState<TagRow | null>(null);
  const [deleting, setDeleting] = useState<TagRow | null>(null);
  const [mergeOpen, setMergeOpen] = useState(false);
  const [masterId, setMasterId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    return tags.filter((t) => {
      if (filterCategoryId !== "all" && !t.category_ids.includes(filterCategoryId)) {
        return false;
      }
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [tags, filterCategoryId, search]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "tags"] });
    qc.invalidateQueries({ queryKey: ["admin", "tag-suggestions"] });
    qc.invalidateQueries({ queryKey: ["tags", "public"] });
  };

  const togglePublic = useMutation({
    mutationFn: (vars: { id: string; is_public: boolean }) => update({ data: vars }),
    onSuccess: () => invalidate(),
    onError: (e: Error) => toast.error(e.message),
  });

  const createMut = useMutation({
    mutationFn: (vars: { name: string; category_ids: string[] }) => create({ data: vars }),
    onSuccess: () => {
      toast.success("Tag created");
      setCreateOpen(false);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const editMut = useMutation({
    mutationFn: (vars: { id: string; name: string; category_ids: string[] }) =>
      update({ data: vars }),
    onSuccess: () => {
      toast.success("Tag updated");
      setEditing(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteMut = useMutation({
    mutationFn: (id: string) => remove({ data: { id } }),
    onSuccess: () => {
      toast.success("Tag deleted");
      setDeleting(null);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const mergeMut = useMutation({
    mutationFn: (vars: { masterId: string; duplicateIds: string[] }) =>
      merge({ data: vars }),
    onSuccess: (res) => {
      toast.success(
        `Merged ${res.merged_count} tag(s). Updated ${res.affected_journeys} listing(s).`,
      );
      setMergeOpen(false);
      setMasterId(null);
      setSelected(new Set());
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const selectedTags = tags.filter((t) => selected.has(t.id));
  const allVisibleSelected =
    filtered.length > 0 && filtered.every((t) => selected.has(t.id));

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {tags.length} tag{tags.length === 1 ? "" : "s"} across {parentCategories.length}{" "}
          categories.
        </p>
        <Button onClick={() => setCreateOpen(true)} className="gap-2">
          <Plus className="size-4" /> Create Tag
        </Button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Input
          placeholder="Search tags..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={filterCategoryId} onValueChange={setFilterCategoryId}>
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="All categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All categories</SelectItem>
            {parentCategories.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selected.size >= 2 && (
        <div className="mb-3 flex items-center justify-between rounded-lg border bg-muted/40 px-4 py-2.5 text-sm">
          <span>{selected.size} tags selected</span>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>
              Clear
            </Button>
            <Button
              size="sm"
              className="gap-2"
              onClick={() => {
                setMasterId(selectedTags[0]?.id ?? null);
                setMergeOpen(true);
              }}
            >
              <GitMerge className="size-4" /> Merge selected
            </Button>
          </div>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <Checkbox
                  checked={allVisibleSelected}
                  onCheckedChange={(v) => {
                    const next = new Set(selected);
                    if (v) filtered.forEach((t) => next.add(t.id));
                    else filtered.forEach((t) => next.delete(t.id));
                    setSelected(next);
                  }}
                />
              </TableHead>
              <TableHead>Tag</TableHead>
              <TableHead>Categories</TableHead>
              <TableHead className="text-center">Public Suggestion</TableHead>
              <TableHead className="w-12"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading &&
              Array.from({ length: 6 }).map((_, i) => (
                <TableRow key={`sk-${i}`}>
                  <TableCell><Skeleton className="size-4" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-28" /></TableCell>
                  <TableCell className="text-center"><Skeleton className="mx-auto h-5 w-10" /></TableCell>
                  <TableCell><Skeleton className="size-8" /></TableCell>
                </TableRow>
              ))}
            {!isLoading && isError && (
              <TableRow>
                <TableCell colSpan={5} className="py-8">
                  <div className="mx-auto max-w-md space-y-3 text-center">
                    <p className="text-sm font-medium text-destructive">
                      Failed to load tags
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {(error as Error)?.message ?? "Unknown error"}
                    </p>
                    <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
                      {isFetching ? "Retrying…" : "Retry"}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            )}
            {!isLoading && !isError && filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="py-8 text-center text-sm text-muted-foreground">
                  No tags match your filters.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <Checkbox
                    checked={selected.has(t.id)}
                    onCheckedChange={(v) => {
                      const next = new Set(selected);
                      if (v) next.add(t.id);
                      else next.delete(t.id);
                      setSelected(next);
                    }}
                  />
                </TableCell>
                <TableCell className="font-medium">{t.name}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-1">
                    {t.category_names.length === 0 ? (
                      <span className="text-xs text-muted-foreground">—</span>
                    ) : (
                      t.category_names.map((n) => (
                        <Badge key={n} variant="outline">
                          {n}
                        </Badge>
                      ))
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-center">
                  <Switch
                    checked={t.is_public}
                    onCheckedChange={(v) =>
                      togglePublic.mutate({ id: t.id, is_public: v })
                    }
                  />
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="size-8">
                        <MoreHorizontal className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onSelect={() => setEditing(t)}>
                        <Pencil className="size-4" /> Edit
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onSelect={() => setDeleting(t)}
                        className="text-destructive focus:text-destructive"
                      >
                        <Trash2 className="size-4" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <TagFormDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        title="Create Tag"
        submitting={createMut.isPending}
        parentCategories={parentCategories}
        onSubmit={(v) => createMut.mutate(v)}
      />

      <TagFormDialog
        open={!!editing}
        onOpenChange={(o) => !o && setEditing(null)}
        title="Edit Tag"
        initial={editing ?? undefined}
        submitting={editMut.isPending}
        parentCategories={parentCategories}
        onSubmit={(v) =>
          editing &&
          editMut.mutate({ id: editing.id, name: v.name, category_ids: v.category_ids })
        }
      />

      <Dialog open={!!deleting} onOpenChange={(o) => !o && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete "{deleting?.name}"?</DialogTitle>
            <DialogDescription>
              This will permanently remove the tag and strip it from every charter listing that
              currently uses it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => deleting && deleteMut.mutate(deleting.id)}
            >
              {deleteMut.isPending ? "Deleting…" : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={mergeOpen} onOpenChange={setMergeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Merge {selectedTags.length} tags</DialogTitle>
            <DialogDescription>
              Pick the master tag. All other selected tags will be replaced with it on every
              charter listing, then deleted.
            </DialogDescription>
          </DialogHeader>
          <RadioGroup value={masterId ?? ""} onValueChange={setMasterId} className="space-y-2 py-2">
            {selectedTags.map((t) => (
              <label
                key={t.id}
                className="flex cursor-pointer items-center gap-3 rounded-md border p-3 hover:bg-muted/40"
              >
                <RadioGroupItem value={t.id} id={`master-${t.id}`} />
                <div className="flex-1">
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.category_names.join(", ") || "—"}
                  </div>
                </div>
              </label>
            ))}
          </RadioGroup>
          <DialogFooter>
            <Button variant="outline" onClick={() => setMergeOpen(false)}>
              Cancel
            </Button>
            <Button
              disabled={!masterId || mergeMut.isPending}
              onClick={() =>
                masterId &&
                mergeMut.mutate({
                  masterId,
                  duplicateIds: selectedTags.filter((t) => t.id !== masterId).map((t) => t.id),
                })
              }
            >
              {mergeMut.isPending ? "Merging…" : "Merge tags"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function SuggestionsTab({
  data,
  isLoading,
  isError,
  error,
  refetch,
  isFetching,
}: {
  data: Suggestion[];
  isLoading: boolean;
  isError: boolean;
  error: Error | null;
  refetch: () => void;
  isFetching: boolean;
}) {
  const qc = useQueryClient();
  const approveFn = useServerFn(approveSuggestion);
  const redirectFn = useServerFn(redirectSuggestion);
  const listMasterFn = useServerFn(listTags);
  const parentCategories = useParentCategories();
  const masterQuery = useQuery({
    queryKey: ["admin", "tags"],
    queryFn: () => listMasterFn(),
    retry: false,
  });
  const masterTags: TagRow[] = (masterQuery.data?.tags ?? []) as TagRow[];

  const [redirecting, setRedirecting] = useState<Suggestion | null>(null);
  const [redirectTargetId, setRedirectTargetId] = useState<string>("");

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "tag-suggestions"] });
    qc.invalidateQueries({ queryKey: ["admin", "tags"] });
    qc.invalidateQueries({ queryKey: ["tags", "public"] });
  };

  const approveMut = useMutation({
    mutationFn: (vars: { name: string; category_ids: string[] }) =>
      approveFn({ data: vars }),
    onSuccess: () => {
      toast.success("Tag approved and added to dictionary");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const redirectMut = useMutation({
    mutationFn: (vars: { fromName: string; toTagId: string }) => redirectFn({ data: vars }),
    onSuccess: (res) => {
      toast.success(`Merged into master tag on ${res.affected} listing(s).`);
      setRedirecting(null);
      setRedirectTargetId("");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="overflow-x-auto rounded-xl border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Suggested tag</TableHead>
            <TableHead className="w-32 text-center">Used on</TableHead>
            <TableHead className="w-[320px] text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading &&
            Array.from({ length: 4 }).map((_, i) => (
              <TableRow key={`sk-${i}`}>
                <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                <TableCell className="text-center"><Skeleton className="mx-auto h-4 w-8" /></TableCell>
                <TableCell><Skeleton className="ml-auto h-8 w-56" /></TableCell>
              </TableRow>
            ))}
          {!isLoading && isError && (
            <TableRow>
              <TableCell colSpan={3} className="py-8">
                <div className="mx-auto max-w-md space-y-3 text-center">
                  <p className="text-sm font-medium text-destructive">
                    Failed to load suggestions
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {error?.message ?? "Unknown error"}
                  </p>
                  <Button size="sm" variant="outline" onClick={refetch} disabled={isFetching}>
                    {isFetching ? "Retrying…" : "Retry"}
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          )}
          {!isLoading && !isError && data.length === 0 && (
            <TableRow>
              <TableCell colSpan={3} className="py-10 text-center text-sm text-muted-foreground">
                No pending suggestions — every tag in use is already in the master dictionary.
              </TableCell>
            </TableRow>
          )}
          {data.map((s) => (
            <TableRow key={s.name}>
              <TableCell className="font-medium">{s.name}</TableCell>
              <TableCell className="text-center">
                <Badge variant="secondary">{s.usage_count}</Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <ApprovePopover
                    suggestion={s}
                    pending={approveMut.isPending && approveMut.variables?.name === s.name}
                    parentCategories={parentCategories}
                    onConfirm={(category_ids) =>
                      approveMut.mutate({ name: s.name, category_ids })
                    }
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    onClick={() => {
                      setRedirecting(s);
                      setRedirectTargetId("");
                    }}
                  >
                    <ArrowRightLeft className="size-3.5" /> Merge / Redirect
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog
        open={!!redirecting}
        onOpenChange={(o) => {
          if (!o) {
            setRedirecting(null);
            setRedirectTargetId("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redirect "{redirecting?.name}"</DialogTitle>
            <DialogDescription>
              Replace this tag on every listing with the master tag you choose below.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label>Master tag</Label>
            <Select value={redirectTargetId} onValueChange={setRedirectTargetId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a master tag" />
              </SelectTrigger>
              <SelectContent>
                {parentCategories.map((cat) => {
                  const inCat = masterTags.filter((t) => t.category_ids.includes(cat.id));
                  if (inCat.length === 0) return null;
                  return (
                    <div key={cat.id}>
                      <div className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                        {cat.name}
                      </div>
                      {inCat.map((t) => (
                        <SelectItem key={`${cat.id}-${t.id}`} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </div>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRedirecting(null)}>
              Cancel
            </Button>
            <Button
              disabled={!redirectTargetId || redirectMut.isPending}
              onClick={() =>
                redirecting &&
                redirectTargetId &&
                redirectMut.mutate({
                  fromName: redirecting.name,
                  toTagId: redirectTargetId,
                })
              }
            >
              {redirectMut.isPending ? "Merging…" : "Merge tag"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryCheckboxList({
  parentCategories,
  selected,
  onChange,
}: {
  parentCategories: CategoryRow[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (id: string, on: boolean) => {
    const set = new Set(selected);
    if (on) set.add(id);
    else set.delete(id);
    onChange(Array.from(set));
  };
  return (
    <div className="max-h-56 overflow-y-auto rounded-md border p-2">
      {parentCategories.length === 0 && (
        <p className="px-1 py-2 text-xs text-muted-foreground">No categories available.</p>
      )}
      {parentCategories.map((c) => {
        const checked = selected.includes(c.id);
        return (
          <label
            key={c.id}
            className="flex cursor-pointer items-center gap-2 rounded-sm px-2 py-1.5 text-sm hover:bg-muted/50"
          >
            <Checkbox
              checked={checked}
              onCheckedChange={(v) => toggle(c.id, !!v)}
            />
            <span>{c.name}</span>
          </label>
        );
      })}
    </div>
  );
}

function ApprovePopover({
  suggestion,
  pending,
  parentCategories,
  onConfirm,
}: {
  suggestion: Suggestion;
  pending: boolean;
  parentCategories: CategoryRow[];
  onConfirm: (category_ids: string[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryIds, setCategoryIds] = useState<string[]>([]);

  return (
    <Popover
      open={open}
      onOpenChange={(o) => {
        setOpen(o);
        if (!o) setCategoryIds([]);
      }}
    >
      <PopoverTrigger asChild>
        <Button size="sm" className="gap-2" disabled={pending}>
          <Check className="size-3.5" /> Approve & Categorize
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        <div className="space-y-1">
          <p className="text-sm font-medium">Approve "{suggestion.name}"</p>
          <p className="text-xs text-muted-foreground">
            Pick one or more categories to add it to the master dictionary.
          </p>
        </div>
        <CategoryCheckboxList
          parentCategories={parentCategories}
          selected={categoryIds}
          onChange={setCategoryIds}
        />
        <div className="flex justify-end gap-2">
          <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={categoryIds.length === 0 || pending}
            onClick={() => {
              if (categoryIds.length === 0) return;
              onConfirm(categoryIds);
              setOpen(false);
            }}
          >
            {pending ? "Saving…" : "Approve"}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}

function TagFormDialog({
  open,
  onOpenChange,
  title,
  initial,
  submitting,
  parentCategories,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  title: string;
  initial?: { name: string; category_ids: string[] };
  submitting: boolean;
  parentCategories: CategoryRow[];
  onSubmit: (v: { name: string; category_ids: string[] }) => void;
}) {
  const [name, setName] = useState(initial?.name ?? "");
  const [categoryIds, setCategoryIds] = useState<string[]>(initial?.category_ids ?? []);

  useEffect(() => {
    if (open) {
      setName(initial?.name ?? "");
      setCategoryIds(initial?.category_ids ?? []);
    }
  }, [open, initial?.name, initial?.category_ids]);

  const canSubmit = name.trim().length > 0 && categoryIds.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="tag-name">Tag name</Label>
            <Input
              id="tag-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Midjourney"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Categories</Label>
            <p className="text-xs text-muted-foreground">
              A tag can belong to multiple main categories.
            </p>
            <CategoryCheckboxList
              parentCategories={parentCategories}
              selected={categoryIds}
              onChange={setCategoryIds}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={!canSubmit || submitting}
            onClick={() =>
              canSubmit && onSubmit({ name: name.trim(), category_ids: categoryIds })
            }
          >
            {submitting ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
