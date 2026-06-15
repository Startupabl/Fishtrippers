import { useMemo } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { listCategories, type CategoryRow } from "@/lib/categories.functions";
import {
  EXPERIENCE_LEVELS,
  type ExperienceLevel,
} from "@/lib/journeys.shared";

const EXPERIENCE_LEVEL_DESCRIPTIONS: Record<ExperienceLevel, string> = {
  Beginner:
    "Beginner: For learners with zero prior experience in this subject or tool. Covers absolute basics, foundational navigation, elementary workflows, and introductory concepts to get started from scratch.",
  Intermediate:
    "Intermediate: For learners who already use these tools/concepts daily but want to optimize their efficiency. Covers intermediate strategies, multi-tool setups, and advanced workflows to save time.",
  Advanced:
    "Advanced: For expert-level or highly technical learners. Requires a strong existing baseline, professional experience, or advanced technical familiarity. Covers complex integrations, deep customization, and expert mastery.",
};

export interface CategoryPickersValue {
  category: string;
  experienceLevel: ExperienceLevel | "";
}

interface Props {
  value: CategoryPickersValue;
  onChange: (next: CategoryPickersValue) => void;
  /** When true, render a compact two-column layout. */
  compact?: boolean;
}

export function CategoryPickers({ value, onChange, compact }: Props) {
  const listFn = useServerFn(listCategories);
  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => listFn(),
    staleTime: 5 * 60 * 1000,
  });

  const parents = useMemo(
    () =>
      [...rows]
        .filter((r: CategoryRow) => r.parent_id === null)
        .sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [rows],
  );

  return (
    <div className={compact ? "grid gap-4 sm:grid-cols-2" : "space-y-4"}>
      <div>
        <label className="text-sm font-medium text-foreground">
          Primary Category <span className="text-destructive">*</span>
        </label>
        <Select
          value={value.category || undefined}
          onValueChange={(v) => onChange({ ...value, category: v })}
        >
          <SelectTrigger className="mt-1 rounded-xl">
            <SelectValue placeholder={isLoading ? "Loading…" : "Select a category"} />
          </SelectTrigger>
          <SelectContent>
            {parents.map((p) => (
              <SelectItem key={p.id} value={p.name}>
                {p.name}
              </SelectItem>
            ))}
            {/* preserve legacy values not in the taxonomy */}
            {value.category &&
              !parents.some((p) => p.name === value.category) && (
                <SelectItem value={value.category}>{value.category}</SelectItem>
              )}
          </SelectContent>
        </Select>
      </div>

      <div className={compact ? "sm:col-span-2" : undefined}>
        <label className="text-sm font-medium text-foreground">
          Experience Level <span className="text-destructive">*</span>
        </label>
        <Select
          value={value.experienceLevel || undefined}
          onValueChange={(v) =>
            onChange({ ...value, experienceLevel: v as ExperienceLevel })
          }
        >
          <SelectTrigger className="mt-1 rounded-xl">
            <SelectValue placeholder="Select an experience level" />
          </SelectTrigger>
          <SelectContent>
            {EXPERIENCE_LEVELS.map((lvl) => (
              <SelectItem key={lvl} value={lvl}>
                {lvl}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <p
          key={value.experienceLevel || "Beginner"}
          className="mt-2 text-xs leading-relaxed text-muted-foreground animate-in fade-in duration-200"
        >
          {EXPERIENCE_LEVEL_DESCRIPTIONS[
            (value.experienceLevel || "Beginner") as ExperienceLevel
          ] ?? EXPERIENCE_LEVEL_DESCRIPTIONS.Beginner}
        </p>
      </div>
    </div>
  );
}
