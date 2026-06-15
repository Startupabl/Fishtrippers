import { useState } from "react";
import { Camera, MessageCircle, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { JourneyThumbnail } from "@/components/listings/JourneyThumbnail";
import { AvailabilityGrid } from "@/components/listings/AvailabilityGrid";
import { SharePath } from "@/components/share/SharePath";
import { CoverCropperDialog } from "@/components/listings/CoverCropperDialog";
import { ExperienceLevelInline } from "@/components/listings/ExperienceLevelInline";
import { ShowcaseBento } from "@/components/portfolio/ShowcaseBento";
import { SessionDescription } from "@/components/listings/SessionDescription";
import { ReportListingDialog } from "@/components/listings/ReportListingDialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { formatCurrency } from "@/lib/format-currency";
import { displayMentorName } from "@/lib/mentor-display";
import { getCategoryPlaceholder } from "@/lib/category-placeholders";
import type { BasicsDraft, DetailsDraft, ShowcaseDraft } from "@/stores/useMentorExpressStore";
import { useProfileStore } from "@/stores/useProfileStore";

const serif = { fontFamily: DESIGN_SYSTEM.fonts.serif };
const montserrat = { fontFamily: "Montserrat, ui-sans-serif, sans-serif" };


interface PreviewStepProps {
  basics: BasicsDraft;
  details: DetailsDraft;
  thumbnailDataUrl?: string;
  mentorName: string;
  mentorBio: string;
  mentorPhotoDataUrl?: string;
  submitting: boolean;
  userId?: string;
  journeyId?: string;
  showcase?: ShowcaseDraft;
  onCoverChange: (dataUrl: string) => void;
  onEditStep: (step: 1 | 2 | 3) => void;
  onBack: () => void;
  onSubmit: () => void;
}

export function PreviewStep({
  basics,
  details,
  thumbnailDataUrl,
  mentorName,
  mentorBio,
  mentorPhotoDataUrl,
  submitting,
  userId,
  journeyId,
  showcase,
  onCoverChange,
  onEditStep,
  onBack,
  onSubmit,
}: PreviewStepProps) {
  const [coverOpen, setCoverOpen] = useState(false);
  const profileCountry = useProfileStore((s) => s.country);
  const profileTimezone = useProfileStore((s) => s.timezone);
  const priceLabel = formatCurrency(
    Math.round(details.priceMajor * 100),
    details.currency,
  );
  const displayName = displayMentorName(mentorName);
  const sessionCount = details.totalMentorSessions;
  const sessionLengthMinutes = details.sessionLengthMinutes;
  const capacity = details.capacity ?? 1;
  const hasCover = !!thumbnailDataUrl;
  const heroSrc = thumbnailDataUrl ?? getCategoryPlaceholder(basics.category);

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900">
        This is a preview of how your listing will appear to learners. Use{" "}
        <strong>Edit</strong> above to make changes, then hit Publish.
      </div>

      {/* Top actions */}
      <div className="flex flex-wrap justify-end gap-2">
        <Button
          type="button"
          onClick={() => onEditStep(1)}
          disabled={submitting}
          className="rounded-2xl border-2 bg-white hover:bg-white/90"
          style={{ borderColor: "#3DA35D", color: "#1F6B36" }}
        >
          Edit
        </Button>
        <Button
          type="button"
          disabled={submitting}
          onClick={onSubmit}
          className="min-h-10 rounded-2xl px-6 text-white"
          style={{ backgroundColor: DESIGN_SYSTEM.colors.accentGreen }}
        >
          {submitting ? "Publishing…" : "Publish"}
        </Button>
      </div>

      {/* HERO */}
      <div className="md:relative">
        <div className="relative overflow-hidden rounded-2xl">
          <JourneyThumbnail
            src={heroSrc}
            alt={basics.title}
            className="aspect-[4/3] w-full md:aspect-[851/315]"
          />
          <div
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/70 via-black/30 to-transparent md:block"
            aria-hidden
          />
          {hasCover ? (
            <button
              type="button"
              onClick={() => setCoverOpen(true)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
            >
              <Camera className="size-3.5" />
              Change cover photo
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setCoverOpen(true)}
              className="absolute left-1/2 top-1/2 inline-flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-2xl px-5 py-3 text-sm font-bold text-foreground shadow-lg transition-transform hover:scale-105"
              style={{ backgroundColor: DESIGN_SYSTEM.colors.sunnyYellow }}
            >
              <Upload className="size-4" />
              Upload Cover Photo
            </button>
          )}
          {/* Desktop overlay title */}
          <div className="absolute inset-x-0 bottom-0 hidden flex-col gap-1 p-6 md:flex">
            <h1
              className="text-2xl font-bold text-white md:text-3xl"
              style={{
                ...serif,
                textShadow:
                  "0 2px 12px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {basics.title}
            </h1>
            <p
              className="text-base text-white md:text-lg"
              style={{
                textShadow:
                  "0 2px 12px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              with <span className="font-semibold">{displayName}</span>
            </p>
          </div>
        </div>
        {/* Mobile-only stacked title */}
        <div className="mt-4 flex flex-col gap-1 md:hidden">
          <h1
            className="text-2xl font-bold text-foreground text-balance"
            style={serif}
          >
            {basics.title}
          </h1>
          <p className="text-base text-foreground">
            with <span className="font-semibold">{displayName}</span>
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* MAIN — 2/3 */}
        <div className="space-y-6 lg:col-span-2 lg:order-1">
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2
              className="text-2xl font-bold text-foreground md:text-3xl"
              style={serif}
            >
              Course Description
            </h2>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="capitalize">
                {basics.category}
              </Badge>
              {basics.experienceLevel && (
                <>
                  <span aria-hidden className="text-muted-foreground">•</span>
                  <ExperienceLevelInline level={basics.experienceLevel} />
                </>
              )}
            </div>
            <p
              className="mt-3 whitespace-pre-line"
              style={{ fontSize: "18px", lineHeight: 1.6, color: "#222222" }}
            >
              {details.description}
            </p>
            {details.tags && details.tags.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {details.tags.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {(showcase?.videoUrl || showcase?.audioUrl || (showcase?.images?.length ?? 0) > 0) && (
            <ShowcaseBento
              firstName={displayMentorName(mentorName)}
              videoUrl={showcase?.videoUrl ?? null}
              audioUrl={showcase?.audioUrl ?? null}
              images={(showcase?.images ?? []).map((i) => ({ url: i.url, storage_path: i.storage_path, sort_order: i.sort_order }))}
              featuredImageUrl={showcase?.featuredImageUrl ?? null}
            />
          )}

          {details.sessionTitles && details.sessionTitles.some((s) => s?.trim()) && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2
                className="text-2xl font-bold text-foreground md:text-3xl"
                style={serif}
              >
                What We'll Cover
              </h2>
              <p
                className="mt-2 italic text-foreground/80"
                style={{ fontSize: "17px", lineHeight: 1.5 }}
              >
                {sessionCount} sessions · {sessionLengthMinutes} min each
              </p>
              <ul className="mt-4 space-y-3">
                {details.sessionTitles
                  .map((t, i) => ({ t: t?.trim(), d: details.sessionDescriptions?.[i]?.trim() ?? "", i }))
                  .filter((x) => x.t)
                  .map(({ t, d, i }) => (
                    <li
                      key={i}
                      className="rounded-2xl border border-border bg-card p-4 md:p-5"
                    >
                      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        Session {i + 1}
                      </p>
                      <p className="mt-1 text-base font-semibold text-foreground md:text-lg">
                        {t}
                      </p>
                      <SessionDescription text={d} className="mt-2" />
                    </li>
                  ))}
              </ul>
            </section>
          )}

          <section className="rounded-2xl border border-border bg-card p-6">
            <h2
              className="text-2xl font-bold text-foreground md:text-3xl"
              style={serif}
            >
              About your Aide
            </h2>
            <div className="mt-4 flex items-start gap-4">
              <div className="size-16 shrink-0 overflow-hidden rounded-full border border-border bg-muted/40">
                {mentorPhotoDataUrl ? (
                  <img
                    src={mentorPhotoDataUrl}
                    alt={displayName}
                    className="size-full object-cover"
                  />
                ) : (
                  <div className="flex size-full items-center justify-center text-sm text-muted-foreground">
                    Photo
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-lg font-semibold text-foreground" style={serif}>
                  {displayName}
                </p>
                {mentorBio ? (
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground/85">
                    {mentorBio}
                  </p>
                ) : (
                  <p className="mt-1 text-sm italic text-muted-foreground">
                    No bio yet — add one so learners get to know you.
                  </p>
                )}
              </div>
            </div>
            <div className="mt-5">
              <Button
                variant="outline"
                size="sm"
                disabled
                title="Available after publishing"
              >
                <MessageCircle className="size-4" />
                Contact {displayName.split(/\s+/)[0] || "Aide"}
              </Button>
            </div>
          </section>

          {/* Social Links */}
          <div className="pt-4">
            <SharePath
              url="#"
              title={basics.title}
              mentorName={displayName}
              compact
            />
          </div>
        </div>

        {/* SIDEBAR — 1/3 */}
        <aside className="space-y-6 lg:col-span-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          {/* Price */}
          <div className="rounded-2xl border border-border bg-card p-5">
            <h2
              className="text-2xl font-bold text-foreground md:text-3xl"
              style={montserrat}
            >
              Price
            </h2>
            <p
              className="mt-3 text-2xl font-bold md:text-3xl"
              style={{ color: "#1F6B36" }}
            >
              {priceLabel}
            </p>
            <p className="text-sm" style={{ color: "#1F6B36" }}>
              Per Person
            </p>

            <Separator className="my-4" />

            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              Includes
            </h3>
            <ul className="mt-2 space-y-1.5 text-[16px] text-foreground">
              <li>
                <strong>{sessionCount}</strong> Session
                {sessionCount === 1 ? "" : "s"}
              </li>
              <li>
                <strong>{sessionLengthMinutes}</strong> Minutes each
              </li>
              <li>
                {capacity === 1 ? (
                  <>
                    Private <strong>1-on-1</strong> Session
                  </>
                ) : (
                  <>
                    Small Group: Up to <strong>{capacity}</strong> people
                  </>
                )}
              </li>
            </ul>

            <Separator className="my-4" />

            <Accordion type="single" collapsible>
              <AccordionItem value="how-bookings-work" className="border-b-0">
                <AccordionTrigger className="py-0 text-base font-semibold text-info hover:no-underline [&>svg]:text-info">
                  How Bookings Work
                </AccordionTrigger>
                <AccordionContent className="pb-0 pt-4">
                  <ul className="list-none space-y-3 text-[15px] leading-[1.6] text-foreground">
                    <li className="flex gap-2">
                      <span aria-hidden="true">💬</span>
                      <span>
                        No sessions currently scheduled? Click <strong>'Message Aide'</strong> directly to request a 1-on-1 session or inquire about joining the next upcoming group cohort. Once you and the Aide agree on a time, they will send a personal booking link straight to your chat inbox.
                      </span>
                    </li>
                  </ul>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          </div>

          {/* Availability + Check Specific Dates */}
          <section className="space-y-4 rounded-2xl border border-border bg-card p-5">
            <AvailabilityGrid
              slots={null}
              country={profileCountry}
              timezone={profileTimezone}
              className="border-0 p-0 rounded-none"
            />

            <div className="flex flex-col gap-1">
              <Button
                size="lg"
                disabled
                title="Available after publishing"
                className="w-full rounded-2xl border-2 bg-white font-bold hover:bg-white/90"
                style={{
                  borderColor: "#1F6B36",
                  color: "#1F6B36",
                  fontFamily: DESIGN_SYSTEM.fonts.serif,
                }}
              >
                <MessageCircle className="mr-1 size-4" />
                Check Specific Dates
              </Button>
              <p className="text-base text-foreground">
                This is what learners see — they'll message you here.
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Set your availability from the dashboard after publishing.
              </p>
            </div>
          </section>

          <div className="flex justify-end pt-2">
            <ReportListingDialog listingId={journeyId ?? null} />
          </div>
        </aside>
      </div>

      {/* ACTIONS */}
      <div className="flex items-center justify-start gap-3 pt-2">
        <Button
          type="button"
          variant="ghost"
          className="rounded-2xl"
          onClick={onBack}
          disabled={submitting}
        >
          Back
        </Button>
      </div>

      <CoverCropperDialog
        open={coverOpen}
        onOpenChange={setCoverOpen}
        mode="preview"
        userId={userId}
        onCropped={(dataUrl) => onCoverChange(dataUrl)}
      />
    </div>
  );
}
