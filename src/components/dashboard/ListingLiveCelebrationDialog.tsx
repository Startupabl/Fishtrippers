import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { Copy, Facebook, Linkedin, Sparkles, Twitter } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { getUnseenLiveListings, markAlertRead } from "@/lib/alerts.functions";
import {
  buildFacebookShare,
  buildLinkedInShare,
  buildXShare,
} from "@/lib/share-links";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;

const SHARE_TEXT =
  "Just launched my new AI course on Lemonaidely! Check it out here:";

export function ListingLiveCelebrationDialog() {
  const fetchUnseen = useServerFn(getUnseenLiveListings);
  const markRead = useServerFn(markAlertRead);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ["unseen-live-listings"],
    queryFn: () => fetchUnseen(),
    staleTime: 30_000,
  });

  const next = data?.[0];
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (next) setOpen(true);
  }, [next?.alertId]);

  const courseUrl = useMemo(() => {
    if (!next) return "";
    const slug = next.slug ?? next.courseIdSlug;
    if (typeof window === "undefined") return `/p/${slug}`;
    return `${window.location.origin}/p/${slug}`;
  }, [next]);

  if (!next) return null;
  const slug = next.slug ?? next.courseIdSlug;

  const handleClose = async () => {
    setOpen(false);
    try {
      await markRead({ data: { id: next.alertId } });
    } catch (err) {
      console.error("[ListingLive] markAlertRead", err);
    }
    qc.invalidateQueries({ queryKey: ["unseen-live-listings"] });
    qc.invalidateQueries({ queryKey: ["alerts"] });
  };

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(courseUrl);
      toast.success("Course link copied!");
    } catch {
      toast.error("Couldn't copy link.");
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="sm:max-w-md text-center">
        <div className="flex flex-col items-center gap-4 pt-2">
          <div
            className="flex size-16 items-center justify-center rounded-full"
            style={{ backgroundColor: `${LEAF}22` }}
          >
            <Sparkles className="size-8" style={{ color: LEAF }} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight" style={lora}>
            Your Course is Live! 🍋
          </h2>
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">"{next.title}"</span>{" "}
            has been approved. You're officially open for business — share it
            now to land your first bookings.
          </p>

          <div className="mt-2 w-full space-y-2">
            <Button
              type="button"
              variant="outline"
              onClick={copyLink}
              className="w-full gap-2"
            >
              <Copy className="size-4" /> Copy Course Link
            </Button>
            <Button
              asChild
              className="w-full text-white hover:opacity-90"
              style={{ backgroundColor: LEAF }}
            >
              <Link
                to="/p/$pathSlug"
                params={{ pathSlug: slug ?? "" }}
                onClick={() => void handleClose()}
              >
                View My Course Page
              </Link>
            </Button>
          </div>

          <div className="mt-2 w-full">
            <p className="mb-2 text-xs font-medium text-muted-foreground">
              Share to Facebook, X, or LinkedIn
            </p>
            <div className="flex justify-center gap-2">
              <a
                href={buildFacebookShare(courseUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on Facebook"
                className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <Facebook className="size-4" />
              </a>
              <a
                href={buildXShare(courseUrl, SHARE_TEXT)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on X"
                className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <Twitter className="size-4" />
              </a>
              <a
                href={buildLinkedInShare(courseUrl)}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Share on LinkedIn"
                className="flex size-10 items-center justify-center rounded-full border border-border hover:bg-muted"
              >
                <Linkedin className="size-4" />
              </a>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground"
          >
            I'll share later
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
