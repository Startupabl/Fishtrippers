import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { validateUserContent } from "@/lib/forbidden-keywords";
import { CategoryPickers } from "./CategoryPickers";
import type { ExperienceLevel } from "@/lib/journeys.shared";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export interface TitleCategoryStepValue {
  title: string;
  category: string;
  experienceLevel: ExperienceLevel;
}

interface TitleCategoryStepProps {
  initialTitle?: string;
  initialCategory?: string;
  initialExperienceLevel?: ExperienceLevel | null;
  onCancel: () => void;
  onNext: (input: TitleCategoryStepValue) => void;
}

export function TitleCategoryStep({
  initialTitle,
  initialCategory,
  initialExperienceLevel,
  onCancel,
  onNext,
}: TitleCategoryStepProps) {
  const [title, setTitle] = useState(initialTitle ?? "");
  const [category, setCategory] = useState<string>(initialCategory ?? "");
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(
    initialExperienceLevel ?? "",
  );
  const [safetyError, setSafetyError] = useState<string | null>(null);

  const titleOk = title.trim().length >= 5 && title.trim().length <= 80;
  const ok = titleOk && !!category && !!experienceLevel;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        const check = validateUserContent({ title });
        if (!check.ok) {
          setSafetyError(check.error ?? null);
          return;
        }
        setSafetyError(null);
        onNext({
          title: title.trim(),
          category,
          experienceLevel: experienceLevel as ExperienceLevel,
        });
      }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-2xl text-foreground" style={lora}>
          Course Details
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Name your course and set your category and experience level so the right learners can discover your listing.
        </p>
      </header>

      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8">
        <div className="space-y-5">
          <div>
            <label className="text-sm font-medium text-foreground">
              Course title
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Ship Your First AI Music Video"
              maxLength={80}
              className="mt-1 rounded-xl"
            />
            <p className="mt-1 text-sm text-muted-foreground">
              5–80 characters.
            </p>
          </div>

          <CategoryPickers
            value={{ category, experienceLevel }}
            onChange={(v) => {
              setCategory(v.category);
              setExperienceLevel(v.experienceLevel);
            }}
          />
        </div>
      </Card>

      {safetyError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive"
        >
          {safetyError}
        </div>
      )}

      <div className="flex items-center justify-between gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-2xl"
          onClick={onCancel}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={!ok}
          className="min-h-12 rounded-2xl text-white"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.accentGreen }}
        >
          Continue
        </Button>
      </div>
    </form>
  );
}
