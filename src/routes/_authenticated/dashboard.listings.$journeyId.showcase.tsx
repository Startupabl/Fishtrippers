import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Star,
  StarOff,
  Trash2,
  Image as ImageIcon,
  Film,
  Music,
  ArrowLeft,
} from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/stores/useAuthStore";
import { useMentorProfileStore } from "@/stores/useMentorProfileStore";
import {
  getJourneyPortfolio,
  updateShowcaseIntro,
  addPortfolioAsset,
  updatePortfolioAsset,
  removePortfolioAsset,
  fetchOembed,
  uploadPortfolioImage,
} from "@/lib/portfolio.functions";
import type { PortfolioAsset } from "@/lib/journeys.functions";
import { PortfolioSection } from "@/components/portfolio/PortfolioBentoGrid";
import { DESIGN_SYSTEM } from "@/lib/brand";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const LEAF = DESIGN_SYSTEM.colors.leafGreen;
const YELLOW = DESIGN_SYSTEM.colors.sunnyYellow;
const MAX_IMG = 5;
const MAX_LINK = 2;

export const Route = createFileRoute(
  "/_authenticated/dashboard/listings/$journeyId/showcase",
)({
  head: () => ({
    meta: [{ title: "Showcase Studio — FishTrippers" }],
  }),
  component: ShowcaseStudioPage,
});

function ShowcaseStudioPage() {
  const { journeyId } = Route.useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const initialized = useAuthStore((s) => s.initialized);
  const profile = useMentorProfileStore();


  const fetchPortfolio = useServerFn(getJourneyPortfolio);
  const updateIntroFn = useServerFn(updateShowcaseIntro);
  const addAssetFn = useServerFn(addPortfolioAsset);
  const updateAssetFn = useServerFn(updatePortfolioAsset);
  const removeAssetFn = useServerFn(removePortfolioAsset);
  const fetchOembedFn = useServerFn(fetchOembed);

  useEffect(() => {
    if (initialized && !user && typeof window !== "undefined") {
      navigate({ to: "/login" });
    }
  }, [initialized, user, navigate]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["journey-portfolio", journeyId, user?.id ?? null],
    queryFn: () => fetchPortfolio({ data: { journeyId } }),
    enabled: !!user,
  });

  const firstName =
    data?.mentor_first_name?.trim() ||
    profile.displayName?.trim().split(/\s+/)[0] ||
    "Aide";

  const [intro, setIntro] = useState("");

  useEffect(() => {
    if (data) setIntro(data.showcase_intro ?? "");
  }, [data]);

  if (!initialized) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }
  if (!user) return null;

  const assets: PortfolioAsset[] = data?.portfolio_assets ?? [];
  const imageCount = assets.filter((a) => a.type === "image").length;
  const linkCount = assets.filter((a) => a.type !== "image").length;
  const journeyTitle = data?.title ?? "your listing";

  async function handleIntroBlur() {
    if (!data) return;
    if ((intro || "") === (data.showcase_intro ?? "")) return;
    try {
      await updateIntroFn({
        data: { journeyId, intro: intro.trim() || null },
      });
      toast.success("Showcase intro saved.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save intro.");
    }
  }

  async function handleImageFiles(files: FileList | null) {
    if (!files || !user) return;
    const remaining = MAX_IMG - imageCount;
    const valid = Array.from(files).slice(0, remaining);
    for (const file of valid) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error(`"${file.name}" is over 2MB.`);
        continue;
      }
      if (!/^image\/(png|jpe?g)$/i.test(file.type)) {
        toast.error(`"${file.name}" must be JPG or PNG.`);
        continue;
      }
      try {
        const ext = (file.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
        const { url, storage_path } = await uploadPortfolioImage(
          file,
          ext,
          user.id,
          journeyId,
        );
        await addAssetFn({
          data: {
            journeyId,
            asset: {
              id: crypto.randomUUID(),
              type: "image",
              url,
              thumbnail_url: url,
              title: file.name,
              caption: null,
              provider: null,
              storage_path,
              is_hero: false,
            },
          },
        });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Upload failed.");
      }
    }
    refetch();
  }

  async function handleAddLink(type: "video" | "music", url: string) {
    if (!url.trim()) return;
    try {
      const meta = await fetchOembedFn({ data: { url: url.trim() } });
      // Music providers must be soundcloud/spotify; video must be youtube/vimeo.
      const wantedProviders =
        type === "music" ? ["soundcloud", "spotify"] : ["youtube", "vimeo"];
      if (meta.provider && !wantedProviders.includes(meta.provider)) {
        toast.error(
          type === "music"
            ? "Please use a SoundCloud or Spotify URL."
            : "Please use a YouTube or Vimeo URL.",
        );
        return;
      }
      await addAssetFn({
        data: {
          journeyId,
          asset: {
            id: crypto.randomUUID(),
            type,
            url: url.trim(),
            thumbnail_url: meta.thumbnail_url,
            title: meta.title,
            caption: null,
            provider: meta.provider,
            storage_path: null,
            is_hero: false,
          },
        },
      });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't add link.");
    }
  }

  async function handleCaptionBlur(asset: PortfolioAsset, caption: string) {
    if ((caption || "") === (asset.caption ?? "")) return;
    try {
      await updateAssetFn({
        data: {
          journeyId,
          assetId: asset.id,
          patch: { caption: caption.trim() || null },
        },
      });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't save caption.");
    }
  }

  async function handleSetHero(asset: PortfolioAsset) {
    try {
      await updateAssetFn({
        data: {
          journeyId,
          assetId: asset.id,
          patch: { is_hero: !asset.is_hero },
        },
      });
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't update hero.");
    }
  }

  async function handleRemove(asset: PortfolioAsset) {
    if (!confirm("Remove this item from your Showcase?")) return;
    try {
      await removeAssetFn({ data: { journeyId, assetId: asset.id } });
      toast.success("Removed.");
      refetch();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Couldn't remove.");
    }
  }

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-[1400px] items-center justify-between px-4 md:px-8 py-4">
          <Logo size="md" />
          <Button asChild variant="ghost">
            <Link to="/dashboard/aide/courses">
              <ArrowLeft className="size-4" /> Back to My Listings
            </Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12">
        <div className="mb-6">
          <h1 className="text-3xl text-foreground md:text-4xl" style={lora}>
            Welcome to your Showcase
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This is where you add a gallery style showcase of your work samples to your listing — for{" "}
            <span className="font-medium text-foreground">{journeyTitle}</span>.
          </p>
        </div>

        {isLoading ? (
          <div className="py-16 text-center text-sm text-muted-foreground">
            Loading your Studio…
          </div>
        ) : (
          <>
            <Card className="rounded-2xl p-5">
              <Label htmlFor="intro" className="text-base font-semibold">
                Showcase Intro
              </Label>
              <p className="mb-2 text-xs text-muted-foreground">
                One sentence that frames the work below. (Optional, max 500 chars.)
              </p>
              <Textarea
                id="intro"
                value={intro}
                onChange={(e) => setIntro(e.target.value)}
                onBlur={handleIntroBlur}
                placeholder="Take a peek inside my Lab…"
                maxLength={500}
                rows={2}
              />
            </Card>

            <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
              <UploadCard
                title="Visuals"
                hint="Up to 5 JPG/PNG, 2MB each."
                icon={<ImageIcon className="size-5" />}
                disabled={imageCount >= MAX_IMG}
                disabledMsg="Your Lab is full! Remove an image to add a new one."
                count={`${imageCount} / ${MAX_IMG}`}
              >
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  multiple
                  disabled={imageCount >= MAX_IMG}
                  onChange={(e) => {
                    handleImageFiles(e.target.files);
                    e.currentTarget.value = "";
                  }}
                  className="block w-full text-sm file:mr-3 file:rounded-md file:border-0 file:bg-foreground file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-background"
                />
              </UploadCard>

              <LinkUploadCard
                title="Motion"
                hint="YouTube or Vimeo URL."
                icon={<Film className="size-5" />}
                disabled={linkCount >= MAX_LINK}
                disabledMsg="Limit reached (2 video/music links)."
                count={`${linkCount} / ${MAX_LINK}`}
                onAdd={(url) => handleAddLink("video", url)}
              />

              <LinkUploadCard
                title="Sound"
                hint="SoundCloud or Spotify URL."
                icon={<Music className="size-5" />}
                disabled={linkCount >= MAX_LINK}
                disabledMsg="Limit reached (2 video/music links)."
                count={`${linkCount} / ${MAX_LINK}`}
                onAdd={(url) => handleAddLink("music", url)}
              />
            </div>

            {/* Asset Manager */}
            <div className="mt-8">
              <h2 className="mb-3 text-xl font-semibold" style={lora}>
                Your Showcase Items
              </h2>
              {assets.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Add your first piece above to see it here.
                </p>
              ) : (
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {assets.map((a) => (
                    <AssetRow
                      key={a.id}
                      asset={a}
                      onCaptionBlur={(v) => handleCaptionBlur(a, v)}
                      onSetHero={() => handleSetHero(a)}
                      onRemove={() => handleRemove(a)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Live Preview */}
            <div className="mt-12">
              <h2 className="mb-1 text-xl font-semibold" style={lora}>
                Live Preview
              </h2>
              <p className="mb-4 text-xs text-muted-foreground">
                This is exactly what learners will see on your listing page.
              </p>
              <div
                className="rounded-2xl border border-dashed p-4"
                style={{ borderColor: `${YELLOW}88` }}
              >
                {assets.length === 0 ? (
                  <p className="py-10 text-center text-sm text-muted-foreground">
                    Nothing to preview yet.
                  </p>
                ) : (
                  <PortfolioSection
                    journeyId={journeyId}
                    firstName={firstName}
                    assets={assets}
                    intro={intro || null}
                  />
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function UploadCard({
  title,
  hint,
  icon,
  disabled,
  disabledMsg,
  count,
  children,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  disabled: boolean;
  disabledMsg: string;
  count: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl p-5">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className="flex size-8 items-center justify-center rounded-lg"
            style={{ backgroundColor: `${YELLOW}33` }}
          >
            {icon}
          </span>
          <h3 className="text-base font-semibold">{title}</h3>
        </div>
        <span className="text-xs text-muted-foreground">{count}</span>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">{hint}</p>
      {children}
      {disabled && (
        <p className="mt-2 text-xs font-medium" style={{ color: LEAF }}>
          {disabledMsg}
        </p>
      )}
    </Card>
  );
}

function LinkUploadCard({
  title,
  hint,
  icon,
  disabled,
  disabledMsg,
  count,
  onAdd,
}: {
  title: string;
  hint: string;
  icon: React.ReactNode;
  disabled: boolean;
  disabledMsg: string;
  count: string;
  onAdd: (url: string) => void | Promise<void>;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);

  return (
    <UploadCard
      title={title}
      hint={hint}
      icon={icon}
      disabled={disabled}
      disabledMsg={disabledMsg}
      count={count}
    >
      <div className="flex gap-2">
        <Input
          placeholder="Paste a link"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          disabled={disabled || busy}
        />
        <Button
          type="button"
          disabled={disabled || busy || !value.trim()}
          onClick={async () => {
            setBusy(true);
            await onAdd(value);
            setValue("");
            setBusy(false);
          }}
          className="text-foreground"
          style={{ backgroundColor: YELLOW }}
        >
          {busy ? "…" : "Add"}
        </Button>
      </div>
    </UploadCard>
  );
}

function AssetRow({
  asset,
  onCaptionBlur,
  onSetHero,
  onRemove,
}: {
  asset: PortfolioAsset;
  onCaptionBlur: (val: string) => void;
  onSetHero: () => void;
  onRemove: () => void;
}) {
  const [caption, setCaption] = useState(asset.caption ?? "");
  useEffect(() => {
    setCaption(asset.caption ?? "");
  }, [asset.caption]);

  const thumb = asset.thumbnail_url || (asset.type === "image" ? asset.url : null);
  const Icon = asset.type === "image" ? ImageIcon : asset.type === "video" ? Film : Music;

  return (
    <Card className="rounded-2xl p-3">
      <div className="flex gap-3">
        <div className="relative size-20 shrink-0 overflow-hidden rounded-lg bg-muted">
          {thumb ? (
            <img src={thumb} alt="" className="size-full object-cover" />
          ) : (
            <div
              className="flex size-full items-center justify-center"
              style={{ backgroundColor: `${YELLOW}33` }}
            >
              <Icon className="size-5" />
            </div>
          )}
          {asset.is_hero && (
            <div
              className="absolute right-1 top-1 rounded-full px-1.5 py-0.5 text-[10px] font-bold text-foreground"
              style={{ backgroundColor: YELLOW }}
            >
              HERO
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">
            {asset.title || asset.type.toUpperCase()}
          </p>
          <Input
            value={caption}
            onChange={(e) => setCaption(e.target.value)}
            onBlur={() => onCaptionBlur(caption)}
            placeholder="Squeeze Tip (caption)"
            maxLength={200}
            className="mt-1 h-8 text-xs"
          />
          <div className="mt-2 flex gap-1">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onSetHero}
              title={asset.is_hero ? "Remove hero" : "Set as Hero"}
              className="h-7 px-2 text-xs"
            >
              {asset.is_hero ? (
                <StarOff className="size-3.5" />
              ) : (
                <Star className="size-3.5" />
              )}
              {asset.is_hero ? "Hero" : "Set Hero"}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={onRemove}
              title="Remove"
              className="h-7 px-2 text-xs text-destructive hover:text-destructive"
            >
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
