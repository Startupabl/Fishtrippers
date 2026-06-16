import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Star, Trash2, UploadCloud, ImageIcon } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { supabase } from "@/integrations/supabase/client";
import {
  listMyOperatorPhotos,
  addOperatorPhoto,
  deleteOperatorPhoto,
  setOperatorCoverPhoto,
  type OperatorPhoto,
} from "@/lib/operator-photos.functions";
import {
  processImage,
  validateImageFile,
  MAX_FILE_BYTES,
  MAX_PHOTOS,
} from "@/lib/image-pipeline";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type UploadItem = {
  id: string;
  name: string;
  progress: number;
  status: "queued" | "processing" | "uploading" | "done" | "error";
  error?: string;
};

export function GalleryManager({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const list = useServerFn(listMyOperatorPhotos);
  const add = useServerFn(addOperatorPhoto);
  const del = useServerFn(deleteOperatorPhoto);
  const setCover = useServerFn(setOperatorCoverPhoto);

  const { data: photos = [], isLoading } = useQuery({
    queryKey: ["operator-photos-mine"],
    queryFn: () => list(),
    enabled: open,
  });

  const [uploads, setUploads] = useState<UploadItem[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const refresh = useCallback(() => {
    qc.invalidateQueries({ queryKey: ["operator-photos-mine"] });
    qc.invalidateQueries({ queryKey: ["operator-listing-preview"] });
  }, [qc]);

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("Photo removed");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Delete failed"),
  });

  const coverMut = useMutation({
    mutationFn: (id: string) => setCover({ data: { id } }),
    onSuccess: () => {
      toast.success("Cover photo updated");
      refresh();
    },
    onError: (e: any) => toast.error(e?.message || "Update failed"),
  });

  const handleFiles = useCallback(
    async (files: FileList | File[]) => {
      const incoming = Array.from(files);
      const currentCount = photos.length;
      const room = MAX_PHOTOS - currentCount;
      if (room <= 0) {
        toast.error(`Maximum of ${MAX_PHOTOS} photos reached`);
        return;
      }

      const accepted: File[] = [];
      for (const file of incoming) {
        if (accepted.length >= room) {
          toast.error(`Only ${room} more photo(s) allowed — extras skipped`);
          break;
        }
        const err = validateImageFile(file);
        if (err) {
          toast.error(`${file.name}: ${err}`);
          continue;
        }
        accepted.push(file);
      }
      if (accepted.length === 0) return;

      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user?.id;
      if (!uid) {
        toast.error("You must be signed in");
        return;
      }

      const items: UploadItem[] = accepted.map((f) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: f.name,
        progress: 0,
        status: "queued",
      }));
      setUploads((u) => [...u, ...items]);

      for (let i = 0; i < accepted.length; i++) {
        const file = accepted[i];
        const item = items[i];
        const update = (patch: Partial<UploadItem>) =>
          setUploads((u) => u.map((x) => (x.id === item.id ? { ...x, ...patch } : x)));

        try {
          update({ status: "processing", progress: 10 });
          const processed = await processImage(file);
          update({ status: "uploading", progress: 40 });

          const photoUuid = crypto.randomUUID();
          const folder = `${uid}/operator-photos/${photoUuid}`;

          const variants = [
            { name: "hero.webp", blob: processed.hero.blob },
            { name: "gallery.webp", blob: processed.gallery.blob },
            { name: "thumb.webp", blob: processed.thumb.blob },
          ];

          for (let v = 0; v < variants.length; v++) {
            const path = `${folder}/${variants[v].name}`;
            const { error } = await supabase.storage
              .from("listing-portfolio")
              .upload(path, variants[v].blob, {
                contentType: "image/webp",
                upsert: false,
              });
            if (error) throw new Error(error.message);
            update({ progress: 40 + Math.round(((v + 1) / variants.length) * 50) });
          }

          const urlFor = (n: string) =>
            supabase.storage.from("listing-portfolio").getPublicUrl(`${folder}/${n}`)
              .data.publicUrl;

          await add({
            data: {
              storage_path: folder,
              hero_url: urlFor("hero.webp"),
              gallery_url: urlFor("gallery.webp"),
              thumb_url: urlFor("thumb.webp"),
              width: processed.originalWidth,
              height: processed.originalHeight,
              bytes: file.size,
            },
          });

          update({ status: "done", progress: 100 });
          refresh();
        } catch (e: any) {
          update({ status: "error", error: e?.message || "Upload failed" });
          toast.error(`${file.name}: ${e?.message || "Upload failed"}`);
        }
      }

      // Auto-clear finished items after a moment
      setTimeout(() => {
        setUploads((u) => u.filter((x) => x.status !== "done"));
      }, 1500);
    },
    [photos.length, add, refresh],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) handleFiles(e.dataTransfer.files);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Manage gallery photos</DialogTitle>
          <DialogDescription>
            Up to {MAX_PHOTOS} photos, 5MB each. Images are auto-optimized.
          </DialogDescription>
        </DialogHeader>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors ${
            dragOver ? "border-primary bg-primary/5" : "border-border bg-muted/30"
          }`}
        >
          <UploadCloud className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">
            Drag &amp; drop photos here, or{" "}
            <button
              type="button"
              className="text-primary underline"
              onClick={() => fileInputRef.current?.click()}
            >
              browse
            </button>
          </p>
          <p className="text-xs text-muted-foreground">
            {photos.length} / {MAX_PHOTOS} photos · max 5MB each
          </p>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files) handleFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        {uploads.length > 0 && (
          <div className="space-y-2">
            {uploads.map((u) => (
              <div key={u.id} className="rounded-lg border bg-card p-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="truncate">{u.name}</span>
                  <span className="text-muted-foreground">
                    {u.status === "error" ? u.error : `${u.progress}%`}
                  </span>
                </div>
                <Progress value={u.progress} className="mt-1 h-1.5" />
              </div>
            ))}
          </div>
        )}

        <div className="max-h-[50vh] overflow-y-auto">
          {isLoading ? (
            <div className="flex items-center justify-center p-6 text-muted-foreground">
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : photos.length === 0 ? (
            <div className="flex flex-col items-center gap-2 p-6 text-center text-muted-foreground">
              <ImageIcon className="h-8 w-8" />
              <p className="text-sm">No photos yet — upload your first photo above.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p: OperatorPhoto) => (
                <div
                  key={p.id}
                  className="group relative aspect-[4/3] overflow-hidden rounded-lg border bg-muted"
                >
                  <img
                    src={p.gallery_url}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  {p.is_cover && (
                    <span className="absolute left-2 top-2 rounded-full bg-gold px-2 py-0.5 text-[10px] font-semibold uppercase text-ocean-deep">
                      Cover
                    </span>
                  )}
                  <div className="absolute inset-x-2 bottom-2 flex justify-between gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-8 w-8"
                      title={p.is_cover ? "Cover photo" : "Set as cover"}
                      disabled={p.is_cover || coverMut.isPending}
                      onClick={() => coverMut.mutate(p.id)}
                    >
                      <Star className={`h-4 w-4 ${p.is_cover ? "fill-current" : ""}`} />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-8 w-8"
                      title="Delete"
                      disabled={delMut.isPending}
                      onClick={() => {
                        if (confirm("Delete this photo?")) delMut.mutate(p.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
