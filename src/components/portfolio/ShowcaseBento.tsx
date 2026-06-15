import { useMemo, useState } from "react";
import { Play } from "lucide-react";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { PortfolioTheater } from "@/components/portfolio/PortfolioTheater";
import type { PortfolioAsset } from "@/lib/journeys.functions";
import type { ShowcaseImage } from "@/lib/journeys.shared";

const serif = { fontFamily: DESIGN_SYSTEM.fonts.serif };

interface Props {
  firstName: string;
  videoUrl: string | null | undefined;
  audioUrl: string | null | undefined;
  images: ShowcaseImage[] | undefined;
  featuredImageUrl?: string | null;
}

function videoEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host === "youtu.be") {
      const id = u.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (host.endsWith("youtube.com")) {
      const id = u.searchParams.get("v");
      if (id) return `https://www.youtube.com/embed/${id}`;
      if (u.pathname.startsWith("/embed/")) return url;
      return null;
    }
    if (host.endsWith("vimeo.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
    if (host.endsWith("loom.com")) {
      const id = u.pathname.split("/").filter(Boolean).pop();
      return id ? `https://www.loom.com/embed/${id}` : null;
    }
    return null;
  } catch { return null; }
}

function audioEmbed(url: string): { kind: "iframe" | "audio"; src: string; height: number } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (host.endsWith("spotify.com")) {
      const embed = new URL(url);
      embed.pathname = embed.pathname.replace(/^\/(track|playlist|episode|album|show)\//, "/embed/$1/");
      return { kind: "iframe", src: embed.toString(), height: 152 };
    }
    if (host.endsWith("soundcloud.com")) {
      return {
        kind: "iframe",
        src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(url)}&color=%233DA35D&auto_play=false&hide_related=true&show_comments=false`,
        height: 120,
      };
    }
    if (/\.(mp3|wav|m4a|ogg)(\?|$)/i.test(u.pathname)) {
      return { kind: "audio", src: url, height: 54 };
    }
    return null;
  } catch { return null; }
}

export function ShowcaseBento({ firstName, videoUrl, audioUrl, images, featuredImageUrl }: Props) {
  const sortedImages = useMemo<ShowcaseImage[]>(() => {
    const arr = [...(images ?? [])].sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0));
    if (featuredImageUrl) {
      const i = arr.findIndex((x) => x.url === featuredImageUrl);
      if (i > 0) { const [hero] = arr.splice(i, 1); arr.unshift(hero); }
    }
    return arr;
  }, [images, featuredImageUrl]);

  const [theaterStart, setTheaterStart] = useState<number | null>(null);

  const hasVideo = !!videoUrl;
  const hasAudio = !!audioUrl;
  const hasImages = sortedImages.length > 0;
  if (!hasVideo && !hasAudio && !hasImages) return null;

  const videoSrc = hasVideo ? videoEmbed(videoUrl!) : null;
  const audio = hasAudio ? audioEmbed(audioUrl!) : null;

  const theaterAssets: PortfolioAsset[] = sortedImages.map((img, i) => ({
    id: img.storage_path || `img-${i}`,
    type: "image",
    url: img.url,
    thumbnail_url: img.url,
    title: null,
    caption: null,
    provider: null,
    storage_path: img.storage_path ?? null,
    is_hero: i === 0,
  }));

  const visible = sortedImages.slice(0, 3);
  const extra = Math.max(0, sortedImages.length - visible.length);

  return (
    <section className="rounded-2xl border border-border bg-card p-6">
      <h2 className="text-2xl font-bold text-foreground md:text-3xl" style={serif}>
        {firstName}-aide Showcase
      </h2>

      <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
        {(hasVideo || hasAudio) && (
          <div className="md:col-span-2 space-y-4">
            {hasVideo && (
              <div className="overflow-hidden rounded-2xl border border-border bg-black/5">
                {videoSrc ? (
                  <div className="relative aspect-video">
                    <iframe
                      src={videoSrc}
                      title="Showcase video"
                      className="absolute inset-0 size-full"
                      frameBorder={0}
                      allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                      allowFullScreen
                    />
                  </div>
                ) : (
                  <a href={videoUrl!} target="_blank" rel="noreferrer" className="block p-4 text-sm underline">
                    Watch video
                  </a>
                )}
              </div>
            )}
            {hasAudio && audio && (
              <div className="overflow-hidden rounded-2xl border border-border bg-card">
                {audio.kind === "iframe" ? (
                  <iframe
                    src={audio.src}
                    title="Showcase audio"
                    className="block w-full"
                    height={audio.height}
                    frameBorder={0}
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    loading="lazy"
                  />
                ) : (
                  <audio controls src={audio.src} className="w-full" />
                )}
              </div>
            )}
          </div>
        )}

        {hasImages && (
          <div className={(hasVideo || hasAudio) ? "md:col-span-1" : "md:col-span-3"}>
            <div className="grid grid-cols-2 gap-2">
              {visible.map((img, i) => {
                const isLast = i === visible.length - 1 && extra > 0;
                const span = visible.length === 1 ? "col-span-2 aspect-video" : i === 0 ? "col-span-2 aspect-video" : "col-span-1 aspect-square";
                return (
                  <button
                    type="button"
                    key={img.storage_path || i}
                    onClick={() => setTheaterStart(i)}
                    className={`group relative overflow-hidden rounded-xl border border-border bg-muted ${span}`}
                  >
                    <img
                      src={img.url}
                      alt={`Showcase ${i + 1}`}
                      className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                    {isLast && (
                      <span className="absolute inset-0 flex items-center justify-center bg-black/55 text-lg font-bold text-white">
                        +{extra} more
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
            {!(hasVideo || hasAudio) && extra === 0 && visible.length === 1 && (
              <p className="mt-2 text-center text-xs text-muted-foreground">
                <Play className="inline size-3" /> Tap to view
              </p>
            )}
          </div>
        )}
      </div>

      {theaterStart !== null && (
        <PortfolioTheater
          assets={theaterAssets}
          startIndex={theaterStart}
          onClose={() => setTheaterStart(null)}
        />
      )}
    </section>
  );
}
