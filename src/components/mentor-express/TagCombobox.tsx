import { memo, useMemo, useRef, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Plus, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { listPublicTags } from "@/lib/tags.functions";
import { cn } from "@/lib/utils";

interface TagComboboxProps {
  value: string[];
  onChange: (next: string[]) => void;
  max?: number;
  maxLength?: number;
}

type PublicTag = { name: string; categories: string[] };

function TagComboboxImpl({
  value,
  onChange,
  max = 10,
  maxLength = 30,
}: TagComboboxProps) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const fetchPublicTags = useServerFn(listPublicTags);
  const { data, isLoading, isError } = useQuery({
    queryKey: ["tags", "public"],
    queryFn: () => fetchPublicTags(),
    staleTime: 5 * 60 * 1000,
  });

  const selectedSet = useMemo(
    () => new Set(value.map((v) => v.toLowerCase())),
    [value],
  );
  const normalizedQuery = query.trim().toLowerCase().slice(0, maxLength);
  const atMax = value.length >= max;

  // Flatten api response into { name, categories: string[] }
  const tagsList: PublicTag[] = useMemo(() => {
    const rows = (data?.tags ?? []) as Array<{ name: string; category_names: string[] }>;
    return rows.map((r) => ({
      name: r.name,
      categories: r.category_names && r.category_names.length > 0 ? r.category_names : ["Other"],
    }));
  }, [data]);

  const grouped = useMemo(() => {
    const map = new Map<string, PublicTag[]>();
    for (const t of tagsList) {
      if (selectedSet.has(t.name.toLowerCase())) continue;
      if (normalizedQuery && !t.name.toLowerCase().includes(normalizedQuery)) continue;
      for (const cat of t.categories) {
        const arr = map.get(cat) ?? [];
        arr.push(t);
        map.set(cat, arr);
      }
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [tagsList, selectedSet, normalizedQuery]);

  const flat = useMemo(() => grouped.flatMap(([, tags]) => tags), [grouped]);

  const allTagNames = useMemo(
    () => new Set(tagsList.map((t) => t.name.toLowerCase())),
    [tagsList],
  );
  const showCreateRow =
    !!normalizedQuery &&
    !allTagNames.has(normalizedQuery) &&
    !selectedSet.has(normalizedQuery);

  // total selectable rows = flat tags + (create row ? 1 : 0)
  const totalRows = flat.length + (showCreateRow ? 1 : 0);

  useEffect(() => {
    setActiveIdx(0);
  }, [normalizedQuery, open]);

  // Click outside to close
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  function addTag(name: string) {
    // Strip surrounding whitespace and trailing/leading punctuation (commas, periods, semicolons, etc.)
    const cleaned = name
      .trim()
      .replace(/^[\s,.;:!?\-–—_/\\|]+|[\s,.;:!?\-–—_/\\|]+$/g, "")
      .trim();
    const n = cleaned.toLowerCase().slice(0, maxLength);
    if (!n) return;

    if (selectedSet.has(n)) return;
    if (value.length >= max) return;
    onChange([...value, n]);
    setQuery("");
    setActiveIdx(0);
  }

  function removeTag(name: string) {
    onChange(value.filter((t) => t !== name));
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      if (totalRows === 0) return;
      e.preventDefault();
      setOpen(true);
      setActiveIdx((i) => (i + 1) % totalRows);
    } else if (e.key === "ArrowUp") {
      if (totalRows === 0) return;
      e.preventDefault();
      setActiveIdx((i) => (i - 1 + totalRows) % totalRows);
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (activeIdx < flat.length) {
        addTag(flat[activeIdx].name);
      } else if (showCreateRow) {
        addTag(normalizedQuery);
      } else if (normalizedQuery) {
        addTag(normalizedQuery);
      }
    } else if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "Backspace" && !query && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  }

  return (
    <div className="space-y-3">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-3 py-1 text-xs text-foreground"
            >
              {t}
              <button
                type="button"
                aria-label={`Remove ${t}`}
                className="text-muted-foreground hover:text-destructive"
                onClick={() => removeTag(t)}
              >
                <X className="size-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      <div ref={containerRef} className="relative">
        <Input
          type="text"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value.slice(0, maxLength));
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          disabled={atMax}
          placeholder={atMax ? `Max ${max} tags` : "Search or add a tag…"}
          className="rounded-xl"
        />

        {open && !atMax && (
          <div
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-[300px] overflow-y-auto rounded-md border border-border bg-popover p-1 text-popover-foreground shadow-md"
            onMouseDown={(e) => e.preventDefault()}
          >
            {isLoading && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Loading suggestions…
              </div>
            )}
            {!isLoading && !isError && totalRows === 0 && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                No matching tags.
              </div>
            )}
            {(() => {
              let idx = 0;
              return (
                <>
                  {grouped.map(([category, tags]) => (
                    <div key={category} className="py-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        {category}
                      </div>
                      {tags.map((t) => {
                        const myIdx = idx++;
                        const active = myIdx === activeIdx;
                        return (
                          <button
                            type="button"
                            key={t.name}
                            onMouseEnter={() => setActiveIdx(myIdx)}
                            onClick={() => addTag(t.name)}
                            className={cn(
                              "flex w-full items-center rounded-sm px-2 py-1.5 text-left text-sm",
                              active && "bg-accent text-accent-foreground",
                            )}
                          >
                            {t.name}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                  {showCreateRow && (
                    <div className="py-1">
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Custom
                      </div>
                      {(() => {
                        const myIdx = idx++;
                        const active = myIdx === activeIdx;
                        return (
                          <button
                            type="button"
                            onMouseEnter={() => setActiveIdx(myIdx)}
                            onClick={() => addTag(normalizedQuery)}
                            className={cn(
                              "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm",
                              active && "bg-accent text-accent-foreground",
                            )}
                          >
                            <Plus className="size-4" />
                            Create "{normalizedQuery}"
                          </button>
                        );
                      })()}
                    </div>
                  )}
                </>
              );
            })()}
            {isError && (
              <div className="px-3 py-4 text-sm text-muted-foreground">
                Couldn't load suggestions. You can still type a tag and press Enter.
              </div>
            )}
          </div>
        )}
      </div>

      <p className="text-sm text-muted-foreground">
        {value.length}/{max} tags
      </p>
    </div>
  );
}

export const TagCombobox = memo(TagComboboxImpl);

