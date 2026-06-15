import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Cropper from "react-easy-crop";
import { ImagePlus, Minus, Plus } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  getCroppedCoverImage,
  validateUpload,
  type CropArea,
} from "@/lib/image-crop";
import { uploadCoverImage } from "@/lib/cover-upload";
import { DESIGN_SYSTEM } from "@/lib/brand";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Required when mode === "upload". */
  userId?: string;
  journeyId?: string;
  /** "upload" (default) uploads to storage and calls onUploaded. "preview" returns a dataURL via onCropped. */
  mode?: "upload" | "preview";
  onUploaded?: (publicUrl: string) => void;
  onCropped?: (dataUrl: string) => void;
}

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export function CoverCropperDialog({
  open,
  onOpenChange,
  userId,
  journeyId,
  mode = "upload",
  onUploaded,
  onCropped,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<CropArea | null>(null);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const imageSrc = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  useEffect(() => {
    if (open) {
      setFile(null);
      setCrop({ x: 0, y: 0 });
      setZoom(1);
      setArea(null);
    }
  }, [open]);

  const onCropComplete = useCallback((_: CropArea, pixels: CropArea) => {
    setArea(pixels);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      validateUpload(f);
      setFile(f);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Invalid image");
    }
    e.target.value = "";
  }

  async function handleSave() {
    if (!file || !area) return;
    setSaving(true);
    try {
      const { blob, ext } = await getCroppedCoverImage(file, area);
      if (mode === "preview") {
        const dataUrl: string = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error("Could not read cropped image"));
          reader.readAsDataURL(blob);
        });
        onCropped?.(dataUrl);
      } else {
        if (!userId) throw new Error("Missing user");
        const url = await uploadCoverImage(blob, ext, userId, journeyId);
        onUploaded?.(url);
      }
      toast.success("Cover photo updated");
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not upload");
    } finally {
      setSaving(false);
    }
  }

  const adjustZoom = (delta: number) =>
    setZoom((z) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, +(z + delta).toFixed(2))));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Change cover photo</DialogTitle>
          <DialogDescription>
            Upload a wide image. Drag to reposition, then zoom to frame it perfectly.
          </DialogDescription>
        </DialogHeader>

        {!file ? (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex aspect-[16/9] w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-border bg-muted text-muted-foreground transition-colors hover:border-info"
          >
            <ImagePlus className="size-8" />
            <span className="text-sm">Click to upload (max 5 MB)</span>
          </button>
        ) : (
          <>
            <div className="relative aspect-[16/9] w-full overflow-hidden rounded-lg bg-muted">
              {imageSrc ? (
                <Cropper
                  image={imageSrc}
                  crop={crop}
                  zoom={zoom}
                  aspect={16 / 9}
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={onCropComplete}
                />
              ) : null}
            </div>

            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Zoom out"
                onClick={() => adjustZoom(-ZOOM_STEP)}
                disabled={zoom <= MIN_ZOOM}
              >
                <Minus className="size-4" />
              </Button>
              <Slider
                value={[zoom]}
                min={MIN_ZOOM}
                max={MAX_ZOOM}
                step={ZOOM_STEP}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
                className="flex-1"
                aria-label="Zoom"
              />
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label="Zoom in"
                onClick={() => adjustZoom(ZOOM_STEP)}
                disabled={zoom >= MAX_ZOOM}
              >
                <Plus className="size-4" />
              </Button>
            </div>
          </>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        <DialogFooter>
          {file && (
            <Button
              type="button"
              variant="ghost"
              onClick={() => setFile(null)}
              disabled={saving}
            >
              Choose different
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving || !file || !area}
            className="font-semibold text-foreground"
            style={{ backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow }}
          >
            {saving ? "Uploading…" : "Save cover"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
