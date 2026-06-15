import { useRef, useState } from "react";
import { Sparkles, Star, Trash2, ArrowLeft, ArrowRight, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { displayMentorName } from "@/lib/mentor-display";
import {
  isAllowedShowcaseVideoUrl,
  isAllowedShowcaseAudioUrl,
} from "@/lib/journeys.shared";
import type { ShowcaseDraft, ShowcaseImageDraft } from "@/stores/useMentorExpressStore";
import {
  uploadShowcaseImage,
  deleteShowcaseImage,
  SHOWCASE_MAX_IMAGES,
  SHOWCASE_MAX_BYTES,
  SHOWCASE_ACCEPT_EXT,
} from "@/lib/showcase-upload";

const serif = { fontFamily: DESIGN_SYSTEM.fonts.serif };

interface Props {
  mentorName: string;
  userId?: string;
  journeyId?: string;
  showcase: ShowcaseDraft | undefined;
  onChange: (next: ShowcaseDraft) => void;
  onClose?: () => void;
  /** Called when something persists-worthy changes (debounced caller). */
  onDirty?: () => void;
}

const EMPTY: ShowcaseDraft = {
  videoUrl: null,
  audioUrl: null,
  images: [],
  featuredImageUrl: null,
};

export function ShowcaseInlineEditor({
  mentorName,
  userId,
  journeyId,
  showcase,
  onChange,
  onClose,
  onDirty,
}: Props) {
  const sc = showcase ?? EMPTY;
  const firstName = displayMentorName(mentorName) || "Your";
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [uploading, setUploading] = useState(false);
  const [videoErr, setVideoErr] = useState<string | null>(null);
  const [audioErr, setAudioErr] = useState<string | null>(null);

  const update = (patch: Partial<ShowcaseDraft>) => {
    onChange({ ...sc, ...patch });
    onDirty?.();
  };

  const handleVideo = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) { setVideoErr(null); update({ videoUrl: null }); return; }
    if (!isAllowedShowcaseVideoUrl(trimmed)) {
      setVideoErr("Use a YouTube, Vimeo, or Loom link.");
    } else {
      setVideoErr(null);
    }
    update({ videoUrl: trimmed });
  };
  const handleAudio = (v: string) => {
    const trimmed = v.trim();
    if (!trimmed) { setAudioErr(null); update({ audioUrl: null }); return; }
    if (!isAllowedShowcaseAudioUrl(trimmed)) {
      setAudioErr("Use a SoundCloud, Spotify, or direct .mp3 / .wav / .m4a link.");
    } else {
      setAudioErr(null);
    }
    update({ audioUrl: trimmed });
  };

  const pickFiles = () => fileRef.current?.click();

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (!userId || !journeyId) {
      toast.error("Save your draft before uploading images.");
      return;
    }
    const remaining = SHOWCASE_MAX_IMAGES - sc.images.length;
    if (remaining <= 0) {
      toast.error(`Up to ${SHOWCASE_MAX_IMAGES} images allowed.`);
      return;
    }
    const toUpload = Array.from(files).slice(0, remaining);
    setUploading(true);
    const added: ShowcaseImageDraft[] = [];
    try {
      for (const f of toUpload) {
        if (f.size > SHOWCASE_MAX_BYTES) {
          toast.error(`"${f.name}" is over 5MB.`);
          continue;
        }
        const ext = (f.name.split(".").pop() || "jpg").toLowerCase();
        if (!SHOWCASE_ACCEPT_EXT.includes(ext as typeof SHOWCASE_ACCEPT_EXT[number])) {
          toast.error(`"${f.name}" has an unsupported format.`);
          continue;
        }
        const { url, storage_path } = await uploadShowcaseImage(f, ext, userId, journeyId);
        added.push({ url, storage_path, sort_order: sc.images.length + added.length });
      }
      if (added.length > 0) {
        const nextImages = [...sc.images, ...added].map((img, i) => ({ ...img, sort_order: i }));
        update({ images: nextImages });
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const setFeatured = (img: ShowcaseImageDraft) => {
    const next = sc.featuredImageUrl === img.url ? null : img.url;
    update({ featuredImageUrl: next });
  };

  const removeImage = async (img: ShowcaseImageDraft) => {
    const nextImages = sc.images
      .filter((i) => i.storage_path !== img.storage_path)
      .map((i, idx) => ({ ...i, sort_order: idx }));
    const nextFeatured = sc.featuredImageUrl === img.url ? null : sc.featuredImageUrl;
    update({ images: nextImages, featuredImageUrl: nextFeatured });
    try { await deleteShowcaseImage(img.storage_path); } catch { /* swallow */ }
  };

  const move = (index: number, dir: -1 | 1) => {
    const target = index + dir;
    if (target < 0 || target >= sc.images.length) return;
    const next = [...sc.images];
    [next[index], next[target]] = [next[target], next[index]];
    update({ images: next.map((i, idx) => ({ ...i, sort_order: idx })) });
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles className="size-5" style={{ color: DESIGN_SYSTEM.colors.leafGreen }} />
          <h2 className="text-2xl font-bold text-foreground md:text-3xl" style={serif}>
            {firstName}-aide Showcase
          </h2>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Hide showcase editor"
          >
            <X className="size-4" />
          </button>
        )}
      </div>
      <p className="mb-5 text-sm text-muted-foreground">
        Optional. Add a video, an audio track, or a small gallery to make your listing stand out.
      </p>

      {/* Video */}
      <div className="space-y-1.5">
        <Label htmlFor="showcase-video">Video Preview URL</Label>
        <Input
          id="showcase-video"
          inputMode="url"
          placeholder="https://youtube.com/... · vimeo.com/... · loom.com/..."
          defaultValue={sc.videoUrl ?? ""}
          onBlur={(e) => handleVideo(e.target.value)}
        />
        {videoErr && <p className="text-xs text-destructive">{videoErr}</p>}
      </div>

      {/* Audio */}
      <div className="mt-4 space-y-1.5">
        <Label htmlFor="showcase-audio">Audio Track URL</Label>
        <Input
          id="showcase-audio"
          inputMode="url"
          placeholder="https://soundcloud.com/... · open.spotify.com/... · .mp3 link"
          defaultValue={sc.audioUrl ?? ""}
          onBlur={(e) => handleAudio(e.target.value)}
        />
        {audioErr && <p className="text-xs text-destructive">{audioErr}</p>}
      </div>

      {/* Images */}
      <div className="mt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <Label>Image Gallery</Label>
            <p className="text-sm text-muted-foreground">
              Up to {SHOWCASE_MAX_IMAGES} images · max 5 MB each · .jpg, .png, .webp
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={uploading || sc.images.length >= SHOWCASE_MAX_IMAGES || !journeyId}
            onClick={pickFiles}
          >
            <Upload className="size-4" />
            {uploading ? "Uploading…" : "Add images"}
          </Button>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            hidden
            onChange={(e) => handleFiles(e.target.files)}
          />
        </div>

        {!journeyId && (
          <p className="mt-2 text-xs text-amber-600">
            Tip: complete step 3 first so we can save your gallery to your draft.
          </p>
        )}

        {sc.images.length > 0 && (
          <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
            {sc.images.map((img, i) => {
              const isFeatured = sc.featuredImageUrl === img.url;
              return (
                <li
                  key={img.storage_path}
                  className="group relative overflow-hidden rounded-xl border border-border bg-muted"
                >
                  <img
                    src={img.url}
                    alt={`Showcase ${i + 1}`}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                  {isFeatured && (
                    <span
                      className="absolute left-1.5 top-1.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold text-foreground shadow"
                      style={{ backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow }}
                    >
                      <Star className="size-3 fill-current" /> Featured
                    </span>
                  )}
                  <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-1 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={() => move(i, -1)}
                      disabled={i === 0}
                      title="Move left"
                      className="rounded-full bg-white/90 p-1 text-foreground disabled:opacity-30"
                    >
                      <ArrowLeft className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setFeatured(img)}
                      title={isFeatured ? "Unset featured" : "Set as featured"}
                      className="rounded-full bg-white/90 p-1 text-foreground"
                    >
                      <Star className={`size-3.5 ${isFeatured ? "fill-current" : ""}`} />
                    </button>
                    <button
                      type="button"
                      onClick={() => removeImage(img)}
                      title="Delete"
                      className="rounded-full bg-white/90 p-1 text-red-600"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => move(i, 1)}
                      disabled={i === sc.images.length - 1}
                      title="Move right"
                      className="rounded-full bg-white/90 p-1 text-foreground disabled:opacity-30"
                    >
                      <ArrowRight className="size-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
