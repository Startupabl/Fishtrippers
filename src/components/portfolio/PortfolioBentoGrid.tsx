// Public Bento Grid for portfolio assets.
import { useMemo, useState } from "react";
import { Play, Music, Flag } from "lucide-react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import type { PortfolioAsset } from "@/lib/journeys.functions";
import { flagPortfolioAsset } from "@/lib/portfolio.functions";
import { DESIGN_SYSTEM } from "@/lib/brand";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { PortfolioTheater } from "./PortfolioTheater";

const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;
const serif = { fontFamily: DESIGN_SYSTEM.fonts.serif };

export interface PortfolioSectionProps {
  journeyId: string;
  firstName: string;
  assets: PortfolioAsset[];
  intro: string | null;
}

export function PortfolioSection({
  journeyId,
  firstName,
  assets,
  intro,
}: PortfolioSectionProps) {
  const [flagOpen, setFlagOpen] = useState(false);
  if (!assets || assets.length === 0) return null;

  const hasImg = assets.some((a) => a.type === "image");
  const hasVid = assets.some((a) => a.type === "video");
  const hasMus = assets.some((a) => a.type === "music");
  const kindCount = [hasImg, hasVid, hasMus].filter(Boolean).length;

  let titlePrefix = "A Little Bit of ";
  if (kindCount === 1) {
    if (hasImg) titlePrefix = "The ";
    if (hasVid) titlePrefix = "The ";
    if (hasMus) titlePrefix = "The ";
  }
  let titleSuffix = "";
  if (kindCount === 1) {
    if (hasImg) titleSuffix = " Gallery";
    else if (hasVid) titleSuffix = " Cinema";
    else if (hasMus) titleSuffix = " Mix";
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={serif}>
            {titlePrefix}
            <span className="font-bold" style={{ color: LEAF, ...serif }}>
              {firstName}-Aide
            </span>
            {titleSuffix}
          </h2>
          {intro && (
            <p className="mt-2 max-w-2xl text-base md:text-lg text-foreground">
              {intro}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setFlagOpen(true)}
          aria-label="Report content"
          className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
          title="Report content"
        >
          <Flag className="size-4" />
        </button>
      </div>

      <BentoGrid assets={assets} />

      <FlagDialog
        open={flagOpen}
        onOpenChange={setFlagOpen}
        journeyId={journeyId}
      />
    </section>
  );
}

export function BentoGrid({ assets }: { assets: PortfolioAsset[] }) {
  const visuals = useMemo(
    () => assets.filter((a) => a.type === "image" || a.type === "video"),
    [assets],
  );
  const music = useMemo(() => assets.filter((a) => a.type === "music"), [assets]);

  // Hero priority: explicit is_hero → first video → first image.
  const heroIndex = useMemo(() => {
    const explicit = visuals.findIndex((a) => a.is_hero);
    if (explicit >= 0) return explicit;
    const vid = visuals.findIndex((a) => a.type === "video");
    if (vid >= 0) return vid;
    return visuals.length > 0 ? 0 : -1;
  }, [visuals]);

  const hero = heroIndex >= 0 ? visuals[heroIndex] : null;
  const rest = visuals.filter((_, i) => i !== heroIndex);

  const [theaterIndex, setTheaterIndex] = useState<number | null>(null);
  const ordered = hero ? [hero, ...rest] : rest;

  return (
    <>
      {visuals.length > 0 && (
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:auto-rows-[140px]">
          {hero && (
            <BentoCell
              asset={hero}
              span="col-span-2 row-span-2 md:col-span-2 md:row-span-2 aspect-square md:aspect-auto"
              onClick={() => setTheaterIndex(0)}
            />
          )}
          {rest.map((a, i) => (
            <BentoCell
              key={a.id}
              asset={a}
              span="col-span-1 row-span-1 aspect-square"
              onClick={() => setTheaterIndex(i + (hero ? 1 : 0))}
            />
          ))}
        </div>
      )}

      {music.length > 0 && (
        <div className="mt-4 space-y-3">
          {music.map((m) => (
            <AudioCard key={m.id} asset={m} />
          ))}
        </div>
      )}

      {theaterIndex !== null && (
        <PortfolioTheater
          assets={ordered}
          startIndex={theaterIndex}
          onClose={() => setTheaterIndex(null)}
        />
      )}
    </>
  );
}

function BentoCell({
  asset,
  span,
  onClick,
}: {
  asset: PortfolioAsset;
  span: string;
  onClick: () => void;
}) {
  const thumb =
    asset.thumbnail_url ||
    (asset.type === "image" ? asset.url : null);

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative overflow-hidden rounded-2xl border border-border bg-muted ${span}`}
    >
      {thumb ? (
        <img
          src={thumb}
          alt={asset.title || asset.caption || "Portfolio item"}
          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      ) : (
        <div
          className="absolute inset-0 flex items-center justify-center"
          style={{ backgroundColor: `${YELLOW}33` }}
        >
          <Play className="size-10 text-foreground" />
        </div>
      )}
      {asset.type === "video" && (
        <div className="absolute inset-0 flex items-center justify-center bg-foreground/10 transition-colors group-hover:bg-foreground/20">
          <span className="flex size-12 items-center justify-center rounded-full bg-background/90 shadow-lg">
            <Play className="size-5 fill-foreground text-foreground" />
          </span>
        </div>
      )}
      {asset.caption && (
        <div className="absolute inset-x-0 bottom-0 translate-y-full bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-xs text-white transition-transform duration-200 group-hover:translate-y-0">
          {asset.caption}
        </div>
      )}
    </button>
  );
}

function AudioCard({ asset }: { asset: PortfolioAsset }) {
  const isSpotify = asset.provider === "spotify";
  const isSoundcloud = asset.provider === "soundcloud";

  const embedUrl = (() => {
    if (isSpotify) {
      // Convert open.spotify.com/track/ID → open.spotify.com/embed/track/ID
      try {
        const u = new URL(asset.url);
        u.pathname = u.pathname.replace(/^\/(track|playlist|episode|album|show)\//, "/embed/$1/");
        return u.toString();
      } catch {
        return asset.url;
      }
    }
    if (isSoundcloud) {
      return `https://w.soundcloud.com/player/?url=${encodeURIComponent(asset.url)}&color=%233DA35D&auto_play=false&hide_related=true&show_comments=false`;
    }
    return asset.url;
  })();

  return (
    <div
      className="overflow-hidden rounded-2xl border border-border/60 bg-card"
      style={{ borderColor: `${YELLOW}55` }}
    >
      <div className="flex items-center gap-3 px-4 py-3">
        {asset.thumbnail_url ? (
          <img
            src={asset.thumbnail_url}
            alt=""
            className="size-12 rounded-lg object-cover"
          />
        ) : (
          <div
            className="flex size-12 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${YELLOW}33` }}
          >
            <Music className="size-5" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {asset.title || "Audio"}
          </p>
          {asset.caption && (
            <p className="truncate text-xs text-muted-foreground">
              {asset.caption}
            </p>
          )}
        </div>
      </div>
      <iframe
        src={embedUrl}
        title={asset.title || "Audio embed"}
        className="block w-full"
        height={isSpotify ? 152 : 120}
        frameBorder="0"
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
        loading="lazy"
      />
    </div>
  );
}

function FlagDialog({
  open,
  onOpenChange,
  journeyId,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  journeyId: string;
}) {
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const flagFn = useServerFn(flagPortfolioAsset);

  async function handleSubmit() {
    setSubmitting(true);
    try {
      await flagFn({ data: { journeyId, reason: reason.trim() || undefined } });
      toast.success("Thanks — our team will review this.");
      onOpenChange(false);
      setReason("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not submit your report.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this Showcase</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Tell us what's wrong. Reports are private and reviewed by our team.
        </p>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="Optional: describe the issue"
          maxLength={500}
          rows={4}
        />
        <div className="flex justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="text-foreground"
            style={{ backgroundColor: YELLOW }}
          >
            {submitting ? "Sending…" : "Send Report"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
