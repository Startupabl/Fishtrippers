import { useMemo, useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { SPECIES_LIST, speciesIdFromLabel, speciesLabel } from "@/lib/operators.shared";

interface Props {
  selected: string[];
  onToggle: (id: string) => void;
}

export function SpeciesMultiSelect({ selected, onToggle }: Props) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedSet = useMemo(() => new Set(selected), [selected]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return SPECIES_LIST.filter((label) => {
      const id = speciesIdFromLabel(label);
      if (selectedSet.has(id)) return false;
      if (!q) return true;
      return label.toLowerCase().includes(q);
    }).slice(0, 50);
  }, [query, selectedSet]);

  useEffect(() => {
    setHighlight(0);
  }, [query, open]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, []);

  function add(label: string) {
    onToggle(speciesIdFromLabel(label));
    setQuery("");
    setOpen(true);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, matches.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      if (matches[highlight]) {
        e.preventDefault();
        add(matches[highlight]);
      }
    } else if (e.key === "Backspace" && !query && selected.length > 0) {
      onToggle(selected[selected.length - 1]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="space-y-3">
      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          placeholder="Start typing a species…"
          className="pl-9"
          aria-label="Targeted Species"
          autoComplete="off"
        />
        {open && matches.length > 0 && (
          <div
            role="listbox"
            className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border bg-popover p-1 shadow-md"
          >
            {matches.map((label, i) => (
              <button
                key={label}
                type="button"
                role="option"
                aria-selected={i === highlight}
                onMouseEnter={() => setHighlight(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  add(label);
                }}
                className={cn(
                  "block w-full rounded-sm px-3 py-2 text-left text-sm",
                  i === highlight ? "bg-accent text-accent-foreground" : "hover:bg-accent/50",
                )}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {open && query && matches.length === 0 && (
          <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover p-3 text-sm text-muted-foreground shadow-md">
            No species match “{query}”.
          </div>
        )}
      </div>

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((id) => (
            <Badge key={id} variant="secondary" className="gap-1 pl-3 pr-1.5 py-1 text-sm">
              {speciesLabel(id)}
              <button
                type="button"
                onClick={() => onToggle(id)}
                aria-label={`Remove ${speciesLabel(id)}`}
                className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full hover:bg-foreground/10"
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
