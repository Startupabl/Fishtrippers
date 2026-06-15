import { useEffect, useMemo, useState } from "react";
import { Info } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { AvatarCropperDialog } from "@/components/settings/AvatarCropperDialog";
import { validateUpload } from "@/lib/image-crop";
import { supabase } from "@/integrations/supabase/client";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileStore } from "@/stores/useProfileStore";
// Local helper: derive initials from a name string.
import {
  isProfileValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

const ABOUT_MIN = 150;
const ABOUT_MAX = 1000;

const ABOUT_COPY = {
  charter: {
    title: "About Our Charter Business",
    placeholder:
      "Our fleet has been serving the area for over a decade. We pride ourselves on safety, top-tier equipment, and our team of expert captains…",
    tips: [
      "Mention fleet size, vessels, and signature equipment.",
      "Call out safety credentials (USCG licensed, first-aid certified).",
      "Highlight your captains' and crew's expertise.",
    ],
  },
  guide: {
    title: "About You & Your Experience",
    placeholder:
      "I've been fishing these waters for over 20 years. I love helping families and beginners learn the ropes…",
    tips: [
      "Share how many years you've been guiding these waters.",
      "Describe your teaching style and who you love taking out.",
      "Mention a signature technique or unique local knowledge.",
    ],
  },
} as const;

export function ProfileStep({ onBack, onNext }: Props) {
  const business_type = useOperatorOnboardingStore((s) => s.business_type);
  const display_name = useOperatorOnboardingStore((s) => s.display_name);
  const location = useOperatorOnboardingStore((s) => s.location);
  const about = useOperatorOnboardingStore((s) => s.about);
  const setProfile = useOperatorOnboardingStore((s) => s.setProfile);
  const valid = useOperatorOnboardingStore(isProfileValid);

  const aboutCopy = ABOUT_COPY[business_type === "charter" ? "charter" : "guide"];
  const aboutLen = about.length;
  const aboutTooShort = aboutLen > 0 && aboutLen < ABOUT_MIN;

  const user = useAuthStore((s) => s.user);
  const storedAvatar = useProfileStore((s) => s.avatarUrl);
  const displayNameFromAuth = user?.displayName ?? "";
  const lastName = useProfileStore((s) => s.lastName) ?? "";

  const [avatarUrl, setAvatarUrl] = useState<string | null>(storedAvatar ?? null);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Prefill avatar from profile on mount (in case store is stale).
  useEffect(() => {
    let active = true;
    if (!user?.id) return;
    if (storedAvatar) {
      setAvatarUrl(storedAvatar);
      return;
    }
    supabase
      .from("profiles")
      .select("avatar_url")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!active) return;
        if (data?.avatar_url) setAvatarUrl(data.avatar_url);
      });
    return () => {
      active = false;
    };
  }, [user?.id, storedAvatar]);

  const initials = useMemo(() => {
    const parts = displayNameFromAuth.trim().split(/\s+/).filter(Boolean);
    const first = parts[0]?.[0] ?? "";
    const last = (parts[1]?.[0] ?? lastName[0] ?? "");
    const base = `${first}${last}`.toUpperCase();
    return base || (user?.email?.[0] ?? "?").toUpperCase();
  }, [displayNameFromAuth, lastName, user?.email]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      validateUpload(file);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid file");
      return;
    }
    setPendingFile(file);
    setCropperOpen(true);
  };

  const handleCropped = async (blob: Blob, ext: string) => {
    if (!user?.id) {
      toast.error("You must be signed in to upload a photo.");
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/avatar.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("avatars")
        .upload(path, blob, { upsert: true, contentType: blob.type });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
      const url = `${pub.publicUrl}?t=${Date.now()}`;
      const { error: updErr } = await supabase
        .from("profiles")
        .update({ avatar_url: url })
        .eq("id", user.id);
      if (updErr) throw updErr;
      setAvatarUrl(url);
      useProfileStore.getState().setProfile({ avatarUrl: url });
      useAuthStore.getState().setAvatarUrl(url);
      toast.success("Photo updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Your business profile</h1>
        <p className="mt-2 text-muted-foreground">
          This is what customers will see in the directory.
        </p>
      </header>

      <div className="space-y-6 rounded-2xl border bg-card p-6">
        {/* Profile image */}
        <div className="space-y-3">
          <div>
            <Label className="text-base font-semibold">Add your profile image</Label>
            <p className="mt-1 text-sm text-muted-foreground">
              This will be displayed on your listing and search results. A
              high-quality logo or a clear professional photo works best.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Avatar className="h-24 w-24">
              {avatarUrl ? <AvatarImage src={avatarUrl} alt="Profile" /> : null}
              <AvatarFallback className="text-xl font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div>
              <Label
                htmlFor="operator-avatar"
                className="inline-flex cursor-pointer items-center justify-center rounded-md border border-input bg-background px-4 py-2 text-sm font-medium hover:bg-accent"
              >
                {uploading
                  ? "Uploading…"
                  : avatarUrl
                    ? "Change photo"
                    : "Upload photo"}
              </Label>
              <Input
                id="operator-avatar"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileSelect}
                disabled={uploading}
              />
              <p className="mt-2 text-xs text-muted-foreground">
                JPG, PNG, or WebP. You can crop and zoom after selecting.
              </p>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="display_name">Business / Display Name</Label>
          <Input
            id="display_name"
            value={display_name}
            onChange={(e) => setProfile({ display_name: e.target.value })}
            placeholder="e.g. Reel Time Charters"
            maxLength={120}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="location">Location / Base of Operations</Label>
          <Input
            id="location"
            value={location}
            onChange={(e) => setProfile({ location: e.target.value })}
            placeholder="e.g. Destin, FL"
            maxLength={200}
          />
          <p className="text-xs text-muted-foreground">
            City and state, marina name, or general region.
          </p>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Label htmlFor="about" className="text-base font-semibold">
              {aboutCopy.title}
            </Label>
            <TooltipProvider delayDuration={150}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    aria-label="Helpful tips"
                    className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                  >
                    <Info className="h-4 w-4" />
                  </button>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p className="mb-1 font-medium">Helpful tips</p>
                  <ul className="list-disc space-y-1 pl-4 text-xs">
                    {aboutCopy.tips.map((t) => (
                      <li key={t}>{t}</li>
                    ))}
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          <Textarea
            id="about"
            value={about}
            onChange={(e) => setProfile({ about: e.target.value })}
            placeholder={aboutCopy.placeholder}
            rows={5}
            maxLength={ABOUT_MAX}
            className="min-h-[140px] resize-y"
          />
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              Minimum {ABOUT_MIN} characters — aim for 2–3 strong sentences.
            </p>
            <p
              className={`text-xs tabular-nums ${
                aboutTooShort ? "text-destructive" : "text-muted-foreground"
              }`}
            >
              {aboutLen} / {ABOUT_MAX}
            </p>
          </div>
        </div>
      </div>


      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext} size="lg">
          Continue
        </Button>
      </div>

      <AvatarCropperDialog
        file={pendingFile}
        open={cropperOpen}
        onOpenChange={(o) => {
          setCropperOpen(o);
          if (!o) setPendingFile(null);
        }}
        onCropped={handleCropped}
      />
    </div>
  );
}
