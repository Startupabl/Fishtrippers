import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { listPublicTags } from "@/lib/tags.functions";
import { cn } from "@/lib/utils";

const MAX_SUGGESTIONS = 8;

type Props = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (value: string) => void;
  placeholder?: string;
  ariaLabel?: string;
  className?: string;
  inputClassName?: string;
  inputStyle?: React.CSSProperties;
  rightSlot?: React.ReactNode;
  panelOffset?: number;
};

export function TagSuggestInput({
  value,
  onChange,
  onSubmit,
  placeholder,
  ariaLabel,
  className,
  inputClassName,
  inputStyle,
  rightSlot,
  panelOffset = 8,
}: Props) {
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [open, setOpen] = React.useState(false);
  const [highlight, setHighlight] = React.useState(-1);

  const fetchTags = useServerFn(listPublicTags);
  const tagsQuery = useQuery({
    queryKey: ["public-tags"],
    queryFn: () => fetchTags(),
    staleTime: 5 * 60 * 1000,
  });
  const allTags = tagsQuery.data?.tags ?? [];

  const suggestions = React.useMemo(() => {
    const q = value.trim().toLowerCase();
    const list = q
      ? allTags.filter((t) => t.name.toLowerCase().includes(q))
      : allTags;
    return list.slice(0, MAX_SUGGESTIONS);
  }, [allTags, value]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  React.useEffect(() => {
    setHighlight(-1);
  }, [value, open]);

  const pick = (name: string) => {
    onChange(name);
    onSubmit(name);
    setOpen(false);
  };

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlight((h) => (h + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => (h <= 0 ? suggestions.length - 1 : h - 1));
    } else if (e.key === "Enter" && highlight >= 0) {
      e.preventDefault();
      pick(suggestions[highlight].name);
    }
  };

  const isEmpty = value.trim().length === 0;

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <input
        type="search"
        value={value}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-autocomplete="list"
        aria-expanded={open}
        className={inputClassName}
        style={inputStyle}
      />
      {rightSlot}
      {open && suggestions.length > 0 && (
        <div
          className="absolute left-0 right-0 z-50 overflow-hidden rounded-2xl border border-border bg-popover text-popover-foreground shadow-lg"
          style={{ top: `calc(100% + ${panelOffset}px)` }}
          role="listbox"
        >
          {isEmpty && (
            <div className="px-3 pt-2.5 pb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Suggested Topics
            </div>
          )}
          <ul className="max-h-80 overflow-y-auto py-1">
            {suggestions.map((t, i) => (
              <li key={`${t.name}-${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={highlight === i}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    pick(t.name);
                  }}
                  onMouseEnter={() => setHighlight(i)}
                  className={cn(
                    "block w-full cursor-pointer px-3 py-2 text-left text-sm transition-colors",
                    highlight === i
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/60",
                  )}
                >
                  {t.name}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
