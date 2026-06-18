import { useRef, useState } from "react";
import { toast } from "sonner";
import { Camera } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

interface MentorIntroFormProps {
  initialBio: string;
  initialDisplayName: string;
  initialPhotoDataUrl: string | null;
  initialApplyBioToAll?: boolean;
  onSubmit: (input: {
    bio: string;
    displayName: string;
    photoDataUrl: string | null;
    applyBioToAll: boolean;
  }) => void;
  onPhotoChange?: (dataUrl: string) => void | Promise<void>;
  onSkip?: () => void;
}

export function MentorIntroForm({
  initialBio,
  initialDisplayName,
  initialPhotoDataUrl,
  initialApplyBioToAll = false,
  onSubmit,
  onPhotoChange,
  onSkip,
}: MentorIntroFormProps) {
  const [bio, setBio] = useState(initialBio);
  const [displayName, setDisplayName] = useState(initialDisplayName);
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(
    initialPhotoDataUrl,
  );
  const [applyBioToAll, setApplyBioToAll] = useState<boolean>(initialApplyBioToAll);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const bioOk = bio.trim().length >= 80 && bio.trim().length <= 600;
  const nameOk = displayName.trim().length >= 2;

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_PHOTO_BYTES) {
      toast.error("Image too large", {
        description: "Please pick an image under 2 MB.",
      });
      e.target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result);
      setPhotoDataUrl(result);
      if (onPhotoChange) void onPhotoChange(result);
    };
    reader.readAsDataURL(file);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!bioOk || !nameOk) return;
    onSubmit({
      bio: bio.trim(),
      displayName: displayName.trim(),
      photoDataUrl,
      applyBioToAll,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <header>
        <h1 className="text-3xl text-foreground" style={lora}>
          Introduce Yourself
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This bio will appear on all your Trips so anglers can get to know
          you. You only need to do this once.
        </p>
      </header>

      <Card className="rounded-3xl border-border/60 bg-card p-6 md:p-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* LEFT — Aide Profile Photo */}
          <div className="flex flex-col items-start gap-3">
            <label className="text-sm font-medium text-foreground">
              Guide Profile Photo
            </label>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="group relative flex size-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-border bg-muted/40 transition-colors hover:border-info"
              aria-label="Upload profile photo"
            >
              {photoDataUrl ? (
                <img
                  src={photoDataUrl}
                  alt="Profile preview"
                  className="size-full object-cover"
                />
              ) : (
                <Camera className="size-7 text-muted-foreground" />
              )}
              <span className="pointer-events-none absolute inset-x-0 bottom-0 bg-foreground/80 py-1 text-center text-[10px] font-medium uppercase tracking-wide text-background opacity-0 transition-opacity group-hover:opacity-100">
                Change
              </span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />
            <p className="text-sm text-muted-foreground">
              This is your personal Guide Avatar for your profile and messages.
              You will upload your specific Fishing Trip Card/Banner photo in a later
              step.
            </p>
          </div>

          {/* RIGHT — Display Name */}
          <div className="flex flex-col">
            <label className="text-sm font-medium text-foreground">
              Display Name
            </label>
            <Input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="e.g. Jane D."
              className="mt-1 rounded-xl"
              maxLength={60}
            />
            <p className="mt-1 text-sm text-muted-foreground">
              We recommend using "First name + Last initial" for your display
              name (e.g., Jane D.).
            </p>
          </div>
        </div>


        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <label className="text-sm font-medium text-foreground">
              Guide Bio
            </label>
            <span
              className={`text-xs ${
                bioOk
                  ? "text-muted-foreground"
                  : bio.length > 0
                    ? "text-destructive"
                    : "text-muted-foreground"
              }`}
            >
              {bio.length}/600
            </span>
          </div>
          <Textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            placeholder="Tell anglers about your background, what you teach, and why you love being an Guide."
            className="mt-1 min-h-32 rounded-xl"
            maxLength={600}
          />
          <p className="mt-1 text-sm text-muted-foreground">
            80–600 characters. This appears at the bottom of every Fishing Trip you
            publish.
          </p>

          <label className="mt-4 flex items-start gap-3 rounded-xl bg-muted/40 p-3 cursor-pointer">
            <Switch
              checked={applyBioToAll}
              onCheckedChange={setApplyBioToAll}
              className="mt-0.5"
            />
            <span className="text-sm text-foreground">
              <span className="font-medium">Make this my standard greeting.</span>
              <span className="block text-sm text-muted-foreground">
                Checking this will update your "Meet the Guide" section across all your current trips.
              </span>
            </span>
          </label>
        </div>
      </Card>

      <div className="flex items-center justify-between gap-3 pt-2">
        {onSkip ? (
          <Button
            type="button"
            variant="ghost"
            className="rounded-2xl"
            onClick={onSkip}
          >
            I'll do this later
          </Button>
        ) : (
          <span />
        )}
        <Button
          type="submit"
          disabled={!bioOk || !nameOk}
          className="min-h-12 rounded-2xl text-white"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.accentGreen }}
        >
          Save &amp; continue
        </Button>
      </div>
    </form>
  );
}
