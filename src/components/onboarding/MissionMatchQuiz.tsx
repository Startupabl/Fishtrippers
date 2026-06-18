import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { OptionCard } from "@/components/onboarding/OptionCard";
import {
  Palette,
  Video,
  Megaphone,
  PenTool,
  Code2,
  Briefcase,
  Music,
  BarChart3,
  GraduationCap,
  Scale,
  Sprout,
  Zap,
  Flame,
  type LucideIcon,
} from "lucide-react";

type LevelKey = "beginner" | "intermediate" | "advanced";
type Category =
  | "Arts & Design"
  | "Video & Multimedia"
  | "Marketing & Social Media"
  | "Text & Writing"
  | "Coding & Web Dev"
  | "Productivity & Workflow"
  | "Audio & Music"
  | "Data & Research"
  | "Education & Coaching"
  | "Professional Services";

const CATEGORY_OPTIONS: { value: Category; icon: LucideIcon }[] = [
  { value: "Arts & Design", icon: Palette },
  { value: "Video & Multimedia", icon: Video },
  { value: "Marketing & Social Media", icon: Megaphone },
  { value: "Text & Writing", icon: PenTool },
  { value: "Coding & Web Dev", icon: Code2 },
  { value: "Productivity & Workflow", icon: Briefcase },
  { value: "Audio & Music", icon: Music },
  { value: "Data & Research", icon: BarChart3 },
  { value: "Education & Coaching", icon: GraduationCap },
  { value: "Professional Services", icon: Scale },
];

const CATEGORY_SKILL_QUESTIONS: Record<Category, [string, string, string]> = {
  "Arts & Design": [
    "I've typed a few prompts into a free image generator just to see what comes out.",
    "I regularly use Midjourney, Firefly, or DALL·E with aspect ratios, style refs, and reroll/variation tricks to get usable images.",
    "I run production design workflows with ControlNet, inpainting, LoRAs, or vector AI tools and ship the results to clients or apps.",
  ],
  "Video & Multimedia": [
    "I've played with an AI video tool once or twice (auto-captions, a quick AI clip, or an AI script draft).",
    "I regularly edit real videos using Runway, Pika, Descript, or CapCut AI — generating b-roll, voiceovers, or short clips for actual posts.",
    "I build end-to-end AI video pipelines (AI avatars, lip-sync, multi-modal generation) and publish cinematic or branded content.",
  ],
  "Marketing & Social Media": [
    "I've asked ChatGPT for a caption or a couple of post ideas now and then.",
    "I regularly write campaign copy, ad creative, and content calendars with AI as part of my weekly marketing work.",
    "I run automated marketing systems — AI-driven SEO audits, multi-channel content engines, or analytics pipelines that act on campaign data.",
  ],
  "Text & Writing": [
    "I've used ChatGPT or Claude to rewrite a sentence, fix grammar, or answer a quick question.",
    "I regularly use system prompts, long-document uploads, and structured prompting to draft real work (articles, reports, emails at scale).",
    "I build custom GPTs, writing agents, or API-driven content pipelines that other people or systems rely on.",
  ],
  "Coding & Web Dev": [
    "I've asked AI to explain a snippet, fix a bug, or write a small piece of HTML/CSS for me.",
    "I regularly build multi-file projects with Cursor, Copilot, Lovable, or similar — shipping features I actually use.",
    "I architect full codebases with AI, manage deployments, and debug complex repo-wide issues using agentic tools.",
  ],
  "Productivity & Workflow": [
    "I've occasionally asked AI to summarize an email, article, or meeting note.",
    "I regularly use the AI features built into Notion, Slack, Gmail, or Google Workspace as part of my daily routine.",
    "I design multi-step automations in Make, Zapier, or n8n that chain AI calls across my tools without me in the loop.",
  ],
  "Audio & Music": [
    "I've tried a free AI tool to clean up audio or generate a fun song clip.",
    "I regularly use AI for voice cloning, text-to-speech, or generating backing tracks for real projects (podcasts, reels, demos).",
    "I integrate AI directly into my DAW for mastering, sound design, stem separation, or full music production workflows.",
  ],
  "Data & Research": [
    "I've used AI a few times to explain a topic or look something up instead of Googling.",
    "I regularly upload CSVs, PDFs, or datasets to AI tools to clean data, pull insights, or build basic charts.",
    "I build scraping or analysis pipelines — writing AI-assisted scripts, running predictive models, or wiring AI into a data stack.",
  ],
  "Education & Coaching": [
    "I've used AI to look up a fact, brainstorm a trip idea, or draft a quick quiz question.",
    "I regularly use AI to build full trip plans, curricula, study guides, or rubrics for my students or clients.",
    "I build interactive AI study bots, custom tutoring tools, or analyze learning data with AI to improve outcomes.",
  ],
  "Professional Services": [
    "I've used AI to draft a basic email, agenda, or set of meeting notes.",
    "I regularly use AI to review contracts, analyze financial reports, or draft client-facing proposals as part of my job.",
    "I build internal AI assistants, knowledge bases, or automated compliance/legal/financial review systems for my firm or clients.",
  ],
};

const LEVEL_META: Record<
  LevelKey,
  { flavor: string; label: string; icon: LucideIcon; blurb: string }
> = {
  beginner: {
    flavor: "Fresh Squeezed",
    label: "Beginner",
    icon: Sprout,
    blurb: "You're starting fresh — we'll match you with welcoming, foundational Guides.",
  },
  intermediate: {
    flavor: "Zesty",
    label: "Intermediate",
    icon: Zap,
    blurb: "You've got real momentum — we'll match you with Guides who'll sharpen your craft.",
  },
  advanced: {
    flavor: "Tart",
    label: "Advanced",
    icon: Flame,
    blurb: "You're operating at a pro level — we'll match you with expert Guides for deep work.",
  },
};

function computeLevel(checked: boolean[]): LevelKey {
  if (checked[2]) return "advanced";
  if (checked[1]) return "intermediate";
  if (checked[0]) return "beginner";
  return "beginner";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MissionMatchQuiz({ open, onOpenChange }: Props) {
  const navigate = useNavigate();
  const [stepIdx, setStepIdx] = useState(0);
  const [category, setCategory] = useState<Category | "">("");
  const [checks, setChecks] = useState<boolean[]>([false, false, false]);
  const [level, setLevel] = useState<LevelKey>("beginner");

  const totalSteps = 3;
  const progress = ((stepIdx + 1) / totalSteps) * 100;

  function reset() {
    setStepIdx(0);
    setCategory("");
    setChecks([false, false, false]);
    setLevel("beginner");
  }

  function handleCategory(v: Category) {
    setCategory(v);
    setChecks([false, false, false]);
    setStepIdx(1);
  }

  function toggleCheck(i: number) {
    setChecks((prev) => prev.map((c, idx) => (idx === i ? !c : c)));
  }

  function handleContinueFromChecks() {
    setLevel(computeLevel(checks));
    setStepIdx(2);
  }

  function handleSeeAides() {
    if (!category) return;
    navigate({
      to: "/search",
      search: {
        q: "",
        category,
        subcategory: "",
        level,
      },
    });
    onOpenChange(false);
    setTimeout(reset, 300);
  }

  const stepHeader =
    stepIdx === 0
      ? "What would you like to learn?"
      : stepIdx === 1
        ? "Which of these sound like you?"
        : "Your AI skill flavor";

  const stepSubheader =
    stepIdx === 0
      ? "Select the area of AI tools you want to explore."
      : stepIdx === 1
        ? "Check any that apply — we'll calculate your level."
        : "Based on your workflow, here's your match.";

  const questions = category ? CATEGORY_SKILL_QUESTIONS[category] : null;
  const meta = LEVEL_META[level];
  const FlavorIcon = meta.icon;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) setTimeout(reset, 300);
      }}
    >
      <DialogContent className="max-w-2xl rounded-2xl max-h-[90vh] overflow-y-auto my-4">
        <DialogHeader>
          <DialogTitle
            className="text-2xl"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            Meet Your Perfect Guide
          </DialogTitle>
          <DialogDescription>
            Answer a couple of quick questions and we'll match you with the ideal AI fishing trip and Guide. 
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{`Step ${stepIdx + 1} of ${totalSteps}`}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="mt-2 bg-primary/20" />
        </div>

        <div
          key={stepIdx}
          className="mt-6 animate-in fade-in-50 slide-in-from-bottom-2 duration-300"
        >
          <h2
            className="text-xl text-foreground"
            style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
          >
            {stepHeader}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{stepSubheader}</p>

          {stepIdx === 0 && (
            <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CATEGORY_OPTIONS.map((o) => (
                <OptionCard
                  key={o.value}
                  icon={o.icon}
                  title={o.value}
                  selected={category === o.value}
                  onSelect={() => handleCategory(o.value)}
                />
              ))}
            </div>
          )}

          {stepIdx === 1 && questions && (
            <>
              <div className="mt-5 space-y-3">
                {questions.map((q, i) => {
                  const id = `skill-check-${i}`;
                  const isChecked = checks[i];
                  return (
                    <label
                      key={i}
                      htmlFor={id}
                      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
                        isChecked
                          ? "border-[#0A2540] bg-[#0A2540]/10"
                          : "border-border hover:border-[#0A2540]/50 hover:bg-[#0A2540]/5"
                      }`}
                    >
                      <Checkbox
                        id={id}
                        checked={isChecked}
                        onCheckedChange={() => toggleCheck(i)}
                        className="mt-0.5"
                      />
                      <span className="text-sm leading-relaxed text-foreground">{q}</span>
                    </label>
                  );
                })}
              </div>

              <div className="mt-6 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStepIdx(0)}
                  className="text-sm text-muted-foreground hover:text-foreground hover:underline"
                >
                  ← Back
                </button>
                <Button onClick={handleContinueFromChecks}>Continue</Button>
              </div>
            </>
          )}

          {stepIdx === 2 && (
            <div className="mt-6 flex flex-col items-center gap-5 rounded-2xl border border-[#0A2540]/30 bg-[#0A2540]/10 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Based on your workflow, your AI skill flavor is:
              </p>
              <div className="flex flex-col items-center gap-3">
                <div className="flex size-16 items-center justify-center rounded-full bg-[#E8B547]/20 text-[#0A2540]">
                  <FlavorIcon className="size-8" />
                </div>
                <h3
                  className="text-3xl text-foreground"
                  style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
                >
                  {meta.flavor}
                </h3>
                <span className="text-xs uppercase tracking-wider text-muted-foreground">
                  {meta.label}
                </span>
              </div>
              <p className="max-w-md text-sm text-foreground/80">{meta.blurb}</p>
              <Button size="lg" onClick={handleSeeAides} className="mt-2">
                See My Perfect Guides
              </Button>
              <button
                type="button"
                onClick={reset}
                className="text-xs text-muted-foreground hover:text-foreground hover:underline"
              >
                ← Start over
              </button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
