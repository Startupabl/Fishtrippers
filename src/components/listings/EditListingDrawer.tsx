import { useEffect, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { X, Camera } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetClose,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { updateJourney, type JourneyRow } from "@/lib/journeys.functions";
import type { ExperienceLevel } from "@/lib/journeys.shared";
import { CategoryPickers } from "@/components/mentor-express/CategoryPickers";
import { CoverCropperDialog } from "@/components/listings/CoverCropperDialog";
import { TagPillRow } from "@/components/listings/TagPillRow";
import { useAuthStore } from "@/stores/useAuthStore";
import { PayoutCalculator } from "@/components/pricing/PayoutCalculator";
import type { CurrencyCode } from "@/stores/useCurrencyStore";

const serif = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const SUNNY = DESIGN_SYSTEM.colors.sunnyYellow;
const LEAF = DESIGN_SYSTEM.colors.leafGreen;

type Section = "basics" | "story" | "image";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  journey: JourneyRow;
  onSaved: (row: JourneyRow) => void;
  initialSection?: Section;
}

export function EditListingDrawer({ open, onOpenChange, journey, onSaved, initialSection = "basics" }: Props) {
  const [section, setSection] = useState<Section>(initialSection);
  const [title, setTitle] = useState(journey.title);
  const [category, setCategory] = useState<string>(journey.category ?? "");
  // subcategory removed
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | "">(
    (journey.experience_level as ExperienceLevel | null | undefined) ?? "",
  );
  const [description, setDescription] = useState(journey.description ?? "");
  const [tagsText, setTagsText] = useState((journey.tags ?? []).join(", "));
  const [priceMajor, setPriceMajor] = useState(
    (journey.base_price_minor / 100).toString(),
  );
  const [coverUrl, setCoverUrl] = useState(journey.cover_image_url ?? "");
  const [capacity, setCapacity] = useState(journey.capacity.toString());
  const [sessionLength, setSessionLength] = useState<string>(
    String(journey.session_length_minutes),
  );
  const [mentorBio, setMentorBio] = useState(journey.mentor_bio ?? "");
  const [sessionTitles, setSessionTitles] = useState<string[]>(() => {
    const initial = (journey.session_titles ?? []).filter((t) => t !== undefined);
    return initial.length > 0 ? initial : [""];
  });
  const [applyBioToAll, setApplyBioToAll] = useState(false);
  const [coverDialogOpen, setCoverDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const user = useAuthStore((s) => s.user);

  const updateFn = useServerFn(updateJourney);

  const fieldFocus =
    "focus-visible:ring-2 focus-visible:ring-offset-0 focus-visible:outline-none";
  const focusStyle = { "--tw-ring-color": LEAF } as React.CSSProperties;

  async function handleSave() {
    setSaving(true);
    try {
      const tags = tagsText
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 10);
      const { row, review_reason } = await updateFn({
        data: {
          id: journey.id,
          title: title.trim(),
          category,
          // subcategory removed
          experience_level: (experienceLevel || null) as ExperienceLevel | null,
          description: description.trim(),
          tags,
          base_price_minor: Math.round(Number(priceMajor || "0") * 100),
          session_count: Math.max(1, sessionTitles.length),
          extra_session_price_minor: 0,
          cover_image_url: coverUrl.trim() || null,
          capacity: Math.max(1, Math.min(50, Math.round(Number(capacity || "1")))),
          session_length_minutes: (Number(sessionLength) as 30 | 45 | 60 | 90),
          mentor_bio: mentorBio.trim() || null,
          session_titles: sessionTitles.map((t) => t.trim()),
          apply_bio_to_all: applyBioToAll,
        },
      });
      if (review_reason === "link") {
        toast.message("Your showcase link is being quickly reviewed by admin to ensure platform security. Your listing will appear live again shortly!");
      } else if (review_reason === "critical") {
        toast.message("Your price or category change is pending a quick admin review. Your listing will be back live shortly!");
      } else {
        toast.success("Your Fishing Trip is refreshed.");
      }
      onSaved(row);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save changes.";
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  }

  const tabBtn = (id: Section, label: string) => (
    <button
      key={id}
      type="button"
      onClick={() => setSection(id)}
      className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
        section === id
          ? "text-white"
          : "bg-muted text-muted-foreground hover:bg-muted/70"
      }`}
      style={section === id ? { backgroundColor: LEAF } : undefined}
    >
      {label}
    </button>
  );

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="flex w-full flex-col gap-0 bg-white p-0 sm:max-w-[480px]"
        style={{ borderLeft: `4px solid ${SUNNY}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <div>
            <h2 className="text-xl text-foreground" style={serif}>
              Refine Your Juice
            </h2>
            <p className="text-sm text-muted-foreground">
              Update your Fishing Trip in place.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex flex-wrap gap-2 border-b border-border/60 px-6 py-3">
          {tabBtn("basics", "Title & Category")}
          {tabBtn("story", "Story & Pricing")}
          {tabBtn("image", "Cover Image")}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          {section === "basics" && (
            <div className="space-y-5">
              <div>
                <Label>Fishing Trip title</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={120}
                  className={`mt-1 ${fieldFocus}`}
                  style={focusStyle}
                />
              </div>
              <CategoryPickers
                value={{ category, experienceLevel }}
                onChange={(v) => {
                  setCategory(v.category);
                  setExperienceLevel(v.experienceLevel);
                }}
              />
            </div>
          )}

          {section === "story" && (
            <div className="space-y-5">
              <div>
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={6}
                  maxLength={2000}
                  className={`mt-1 ${fieldFocus}`}
                  style={focusStyle}
                />
              </div>
              <div className="rounded-2xl border border-border/60 bg-muted/30 p-4 space-y-3">
                <div>
                  <h3 className="text-sm font-semibold text-foreground" style={serif}>
                    Guide Profile Info
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Shown on your live listing under "About the Guide".
                  </p>
                </div>
                <div>
                  <Label>About the Guide</Label>
                  <Textarea
                    value={mentorBio}
                    onChange={(e) => setMentorBio(e.target.value)}
                    rows={5}
                    maxLength={1000}
                    placeholder="Tell your students a bit about your expertise and why you're the perfect Guide to guide them through this fishing trip!"
                    className={`mt-1 ${fieldFocus}`}
                    style={focusStyle}
                  />
                  <p className="mt-1 text-right text-xs text-muted-foreground">
                    {mentorBio.length}/1000
                  </p>
                </div>
                <label className="flex items-start gap-3 rounded-xl bg-card p-3 cursor-pointer">
                  <Switch
                    checked={applyBioToAll}
                    onCheckedChange={setApplyBioToAll}
                    className="mt-0.5"
                  />
                  <span className="text-xs text-foreground">
                    <span className="font-medium">Make this my standard greeting.</span>
                    <span className="block text-muted-foreground">
                      Checking this will update your "Meet the Guide" section across all your current trips.
                    </span>
                  </span>
                </label>
              </div>
              <div>
                <Label>Tags (comma separated)</Label>
                <Input
                  value={tagsText}
                  onChange={(e) => setTagsText(e.target.value)}
                  className={`mt-1 ${fieldFocus}`}
                  style={focusStyle}
                />
                <TagPillRow
                  tags={tagsText
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .slice(0, 10)}
                  className="mt-2"
                />
              </div>
              <div>
                <PayoutCalculator
                  priceMajor={Number(priceMajor) || 0}
                  currency={journey.currency as CurrencyCode}
                  onPriceChange={(n) => setPriceMajor(String(n))}
                />
              </div>
              <div className="border-t border-border/60 pt-4">
                <Label>Fishing Trip Roadmap</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Give each session a clear title so anglers can see the path ahead.
                </p>
                <div className="mt-3 space-y-3">
                  {sessionTitles.map((title, i) => (
                    <div key={i}>
                      <Label className="text-xs text-muted-foreground">
                        Session {i + 1} Title
                      </Label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          value={title}
                          onChange={(e) => {
                            const next = [...sessionTitles];
                            next[i] = e.target.value;
                            setSessionTitles(next);
                          }}
                          placeholder="What will you cover in this session?"
                          className={fieldFocus}
                          style={focusStyle}
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove session ${i + 1}`}
                          disabled={sessionTitles.length <= 1}
                          onClick={() =>
                            setSessionTitles(sessionTitles.filter((_, j) => j !== i))
                          }
                          className="shrink-0 text-muted-foreground hover:text-destructive"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      setSessionTitles((prev) => (prev.length >= 20 ? prev : [...prev, ""]))
                    }
                    disabled={sessionTitles.length >= 20}
                    className="rounded-xl"
                  >
                    + Add Another Session
                  </Button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Angler Capacity</Label>
                  <Input
                    type="number"
                    min={1}
                    max={50}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className={`mt-1 ${fieldFocus}`}
                    style={focusStyle}
                  />
                  <p className="mt-1 text-sm text-muted-foreground">
                    How many anglers can join this fishing trip session?
                  </p>
                </div>
                <div>
                  <Label>Session Length</Label>
                  <Select value={sessionLength} onValueChange={setSessionLength}>
                    <SelectTrigger className={`mt-1 ${fieldFocus}`} style={focusStyle}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {[30, 45, 60, 90].map((m) => (
                        <SelectItem key={m} value={String(m)}>
                          {m} mins
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          )}

          {section === "image" && (
            <div className="space-y-4">
              <div>
                <Label>Cover photo</Label>
                <p className="mt-1 text-sm text-muted-foreground">
                  Upload, then crop and zoom to fit a 16:9 frame.
                </p>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setCoverDialogOpen(true)}
                  disabled={!user}
                  className="mt-2 rounded-2xl"
                >
                  <Camera className="size-4" />
                  {coverUrl ? "Replace cover photo" : "Upload cover photo"}
                </Button>
              </div>
              {coverUrl && (
                <div className="overflow-hidden rounded-xl border border-border">
                  <img
                    src={coverUrl}
                    alt="Cover preview"
                    className="aspect-[16/9] w-full object-cover"
                  />
                </div>
              )}
              {user && (
                <CoverCropperDialog
                  open={coverDialogOpen}
                  onOpenChange={setCoverDialogOpen}
                  userId={user.id}
                  journeyId={journey.id}
                  onUploaded={(url) => setCoverUrl(url)}
                />
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 flex items-center justify-between gap-3 border-t border-border/60 bg-white px-6 py-4">
          <SheetClose asChild>
            <Button type="button" variant="ghost" className="rounded-2xl">
              Cancel
            </Button>
          </SheetClose>
          <Button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="min-h-11 rounded-2xl text-foreground hover:opacity-90"
            style={{ backgroundColor: SUNNY }}
          >
            {saving ? "Saving…" : "Save Changes"}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
