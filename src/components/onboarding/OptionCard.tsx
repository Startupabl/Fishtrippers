import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface OptionCardProps {
  icon: LucideIcon;
  title: string;
  helper?: string;
  selected?: boolean;
  onSelect: () => void;
}

export function OptionCard({
  icon: Icon,
  title,
  helper,
  selected,
  onSelect,
}: OptionCardProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={!!selected}
      className={cn(
        "group flex min-h-[88px] w-full items-center gap-4 rounded-2xl border bg-card p-4 text-left transition-all",
        "hover:-translate-y-0.5 hover:border-info hover:shadow",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-info focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        selected
          ? "border-info ring-2 ring-info"
          : "border-border",
      )}
    >
      <span
        className={cn(
          "inline-flex size-12 shrink-0 items-center justify-center rounded-xl transition-colors",
          selected
            ? "bg-info text-info-foreground"
            : "bg-muted text-foreground group-hover:bg-info/10 group-hover:text-info",
        )}
      >
        <Icon className="size-6" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-base font-medium text-foreground">
          {title}
        </span>
        {helper && (
          <span className="mt-0.5 block text-sm text-muted-foreground">
            {helper}
          </span>
        )}
      </span>
    </button>
  );
}
