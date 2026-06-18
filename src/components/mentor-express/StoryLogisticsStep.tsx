import { memo, useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  useCurrencyStore,
  type CurrencyCode,
} from "@/stores/useCurrencyStore";
import { getCurrencyMeta, SUPPORTED_CURRENCIES } from "@/lib/currency";
import { detectCurrency } from "@/lib/detect-currency";
import { DESIGN_SYSTEM } from "@/lib/brand";
import type { DetailsDraft } from "@/stores/useMentorExpressStore";
import { validateUserContent } from "@/lib/forbidden-keywords";
import { PayoutCalculator } from "@/components/pricing/PayoutCalculator";
import { TagCombobox } from "@/components/mentor-express/TagCombobox";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

const SESSION_LENGTHS = [30, 45, 60, 90] as const;

interface StoryLogisticsStepProps {
  initial?: DetailsDraft;
  onBack: () => void;
  onNext: (details: DetailsDraft) => void;
}

export function StoryLogisticsStep({
  initial,
  onBack,
  onNext,
}: StoryLogisticsStepProps) {
  const currency = useCurrencyStore((s) => s.currency);
  const setCurrency = useCurrencyStore((s) => s.setCurrency);
  const hasManualCurrency = useCurrencyStore((s) => s.hasManualCurrency);

  const [description, setDescription] = useState(initial?.description ?? "");
  const [sessionLength, setSessionLength] = useState<number>(initial?.sessionLengthMinutes ?? 45);
  const [capacity, setCapacity] = useState<number>(initial?.capacity ?? 1);
  const [sessionTitles, setSessionTitles] = useState<string[]>(
    initial?.sessionTitles && initial.sessionTitles.length > 0 ? initial.sessionTitles : [""],
  );
  const [sessionDescriptions, setSessionDescriptions] = useState<string[]>(() => {
    const base = initial?.sessionDescriptions ?? [];
    const len = initial?.sessionTitles?.length && initial.sessionTitles.length > 0 ? initial.sessionTitles.length : 1;
    return Array.from({ length: len }, (_, i) => base[i] ?? "");
  });
  const sessions = sessionTitles.length;
  const [tags, setTags] = useState<string[]>(initial?.tags ?? []);
  

  // Whole-number price in the user's display currency (major units).
  const [priceMajor, setPriceMajor] = useState<number>(
    initial?.priceMajor ? Math.round(initial.priceMajor) : 200,
  );

  const [showCurrencyOverride, setShowCurrencyOverride] = useState(false);
  const [safetyError, setSafetyError] = useState<string | null>(null);

  const handleTitleChange = useCallback((index: number, value: string) => {
    setSessionTitles((prev) => {
      const next = prev.slice();
      next[index] = value;
      return next;
    });
  }, []);

  const handleDescriptionChange = useCallback((index: number, value: string) => {
    setSessionDescriptions((prev) => {
      const next = prev.slice();
      while (next.length <= index) next.push("");
      next[index] = value;
      return next;
    });
  }, []);

  const handleRemoveSession = useCallback((index: number) => {
    setSessionTitles((prev) => prev.filter((_, j) => j !== index));
    setSessionDescriptions((prev) => prev.filter((_, j) => j !== index));
  }, []);

  const handleAddSession = useCallback(() => {
    setSessionTitles((prev) => (prev.length >= 20 ? prev : [...prev, ""]));
    setSessionDescriptions((prev) => (prev.length >= 20 ? prev : [...prev, ""]));
  }, []);

  // Smart detection: only seed once if user hasn't manually set.
  useEffect(() => {
    if (!hasManualCurrency) {
      const detected = detectCurrency();
      if (detected !== currency) setCurrency(detected, false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalHours = (sessions * sessionLength) / 60;
  const totalHoursLabel =
    Number.isInteger(totalHours) ? `${totalHours}` : totalHours.toFixed(1);

  const ok =
    description.trim().length >= 80 &&
    description.trim().length <= 800 &&
    sessions >= 1 &&
    sessions <= 20 &&
    capacity >= 1 &&
    capacity <= 50 &&
    priceMajor >= 1;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!ok) return;
        const check = validateUserContent({
          description,
          sessionTitles,
          sessionDescriptions,
          tags,
        });
        if (!check.ok) {
          setSafetyError(check.error ?? null);
          return;
        }
        setSafetyError(null);
        onNext({
          description: description.trim(),
          totalLessons: sessions,
          totalMentorSessions: sessions,
          durationWeeks: Math.max(1, Math.ceil(sessions / 2)),
          priceMajor: priceMajor,
          currency,
          sessionTitles: sessionTitles.map((t) => t.trim()),
          sessionDescriptions: sessionDescriptions.map((d) => d.trim()),
          tags,
          capacity,
          sessionLengthMinutes: sessionLength as 30 | 45 | 60 | 90,
        });
      }}
      className="space-y-6"
    >
      <header>
        <h2 className="text-2xl text-foreground" style={lora}>
          Fishing Trip Description
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Describe what anglers will create, set the pace, and price the journey.
        </p>
      </header>

      {/* Course description */}
      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8 space-y-5">
        <div>
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium text-foreground">
              Describe Your Fishing Trip
            </label>
            <span className="text-xs text-muted-foreground">
              {description.length}/800
            </span>
          </div>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What will anglers create or master? Who is this for?"
            className="mt-1 min-h-32 rounded-xl"
            maxLength={800}
          />
          <p className="mt-1 text-sm text-muted-foreground">80–800 characters.</p>
        </div>
      </Card>

      

      {/* The Course Roadmap */}
      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8 space-y-4">
        <div>
          <h3 className="text-lg text-foreground" style={lora}>
            The Fishing Trip Roadmap
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Give each session a clear title so anglers can see the path ahead.
          </p>
        </div>

        <div className="space-y-4">
          {sessionTitles.map((title, i) => (
            <SessionRow
              key={i}
              index={i}
              title={title}
              description={sessionDescriptions[i] ?? ""}
              canRemove={sessionTitles.length > 1}
              onTitleChange={handleTitleChange}
              onDescriptionChange={handleDescriptionChange}
              onRemove={handleRemoveSession}
            />
          ))}
          <Button
            type="button"
            variant="outline"
            onClick={handleAddSession}
            disabled={sessionTitles.length >= 20}
            className="rounded-xl"
          >
            + Add Another Session
          </Button>
        </div>
      </Card>


      {/* Contact Hours */}
      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8 space-y-5">
        <div>
          <h3 className="text-lg text-foreground" style={lora}>
            Contact Hours
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Total engagement hours included in this fishing trip.
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Session Length
          </label>
          <Select
            value={String(sessionLength)}
            onValueChange={(v) => setSessionLength(Number(v))}
          >
            <SelectTrigger className="mt-1 rounded-xl sm:max-w-[200px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SESSION_LENGTHS.map((m) => (
                <SelectItem key={m} value={String(m)}>
                  {m} mins
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <label className="text-sm font-medium text-foreground">
            Angler Capacity
          </label>
          <Input
            type="number"
            min={1}
            max={50}
            value={capacity}
            onChange={(e) => setCapacity(Math.max(1, Math.min(50, Number(e.target.value) || 1)))}
            className="mt-1 rounded-xl sm:max-w-[200px]"
            required
          />
          <p className="mt-1 text-sm text-muted-foreground">
            How many anglers can join this fishing trip session?
          </p>
        </div>

        <Badge
          className="rounded-full px-3 py-1 text-xs text-white"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.accentGreen }}
        >
          Total Contact Hours: {totalHoursLabel} {totalHours === 1 ? "Hour" : "Hours"}
        </Badge>
      </Card>


      {/* Discovery Tags */}
      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8 space-y-3">
        <div>
          <h3 className="text-lg text-foreground" style={lora}>
            Discovery Tags
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Add up to 10 keywords anglers might search for (e.g. "ChatGPT", "Midjourney", "resume").
          </p>
        </div>
        <TagCombobox value={tags} onChange={setTags} max={10} maxLength={30} />

      </Card>

      {/* Smart & Flexible Pricing */}
      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8 space-y-4">
        <PayoutCalculator
          priceMajor={priceMajor}
          currency={currency}
          onPriceChange={setPriceMajor}
          onCurrencyChange={(c: CurrencyCode) => setCurrency(c, true)}
          showCurrencyOverride
        />
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
          onClick={onBack}
        >
          Back
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

interface SessionRowProps {
  index: number;
  title: string;
  description: string;
  canRemove: boolean;
  onTitleChange: (index: number, value: string) => void;
  onDescriptionChange: (index: number, value: string) => void;
  onRemove: (index: number) => void;
}

const SessionRow = memo(function SessionRow({
  index,
  title,
  description,
  canRemove,
  onTitleChange,
  onDescriptionChange,
  onRemove,
}: SessionRowProps) {
  return (
    <div className="rounded-2xl border border-border/60 bg-background/40 p-4 space-y-2">
      <label className="text-sm font-medium text-foreground">
        Session {index + 1} Title
      </label>
      <div className="flex items-center gap-2">
        <Input
          value={title}
          onChange={(e) => onTitleChange(index, e.target.value)}
          placeholder="What will you cover in this session?"
          maxLength={120}
          className="rounded-xl"
        />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={`Remove session ${index + 1}`}
          disabled={!canRemove}
          onClick={() => onRemove(index)}
          className="shrink-0 text-muted-foreground hover:text-destructive"
        >
          ×
        </Button>
      </div>
      <div>
        <div className="flex items-baseline justify-between">
          <label className="text-xs font-medium text-muted-foreground">
            Session {index + 1} Description{" "}
            <span className="text-muted-foreground/70">(optional)</span>
          </label>
          <span className="text-[10px] text-muted-foreground">
            {description.length}/600
          </span>
        </div>
        <Textarea
          value={description}
          onChange={(e) => onDescriptionChange(index, e.target.value)}
          placeholder="Add a short description of what anglers will explore in this session."
          maxLength={600}
          className="mt-1 min-h-20 rounded-xl text-sm"
        />
      </div>
    </div>
  );
});
