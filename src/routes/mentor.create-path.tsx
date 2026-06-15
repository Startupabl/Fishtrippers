import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyStripeIds } from "@/lib/payouts.functions";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, AlertTriangle, X } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/brand/Logo";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { CreationStepper, type CreationStep } from "@/components/mentor-express/CreationStepper";
import { MentorIntroForm } from "@/components/mentor-express/MentorIntroForm";
import { TitleCategoryStep } from "@/components/mentor-express/TitleCategoryStep";
import { StoryLogisticsStep } from "@/components/mentor-express/StoryLogisticsStep";
import { PreviewStep } from "@/components/mentor-express/PreviewStep";
import { supabase } from "@/integrations/supabase/client";
import {
  clearPersistedMentorExpressDraft,
  MENTOR_EXPRESS_NEW_LISTING_EVENT,
  useMentorExpressStore,
} from "@/stores/useMentorExpressStore";
import { useMentorProfileStore } from "@/stores/useMentorProfileStore";
import { useLessonPathsStore } from "@/stores/useLessonPathsStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { useProfileCompletion } from "@/hooks/useProfileCompletion";
import {
  publishJourney,
  upsertJourneyDraft,
  getJourneyDraft,
} from "@/lib/journeys.functions";
import { ALERTS_CHANGED_EVENT } from "@/components/layout/AlertsBellButton";
import type { JourneyCategory } from "@/data/lesson-paths";
import type { CurrencyCode } from "@/stores/useCurrencyStore";

export const Route = createFileRoute("/mentor/create-path")({
  validateSearch: (search) =>
    z
      .object({
        draftId: z.string().uuid().optional(),
        new: z.boolean().optional(),
        empty: z.boolean().optional(),
      })
      .parse(search),
  component: CreatePathPage,
});

function resetNewListingDraft() {
  useMentorExpressStore.getState().reset();
  clearPersistedMentorExpressDraft();
}

function CreatePathPage() {
  const navigate = useNavigate();
  const { draftId: searchDraftId, new: isNew, empty: emptyFlag } = Route.useSearch();
  const initialized = useAuthStore((s) => s.initialized);
  const authUser = useAuthStore((s) => s.user);
  const { isComplete, isLoading: profileLoading } = useProfileCompletion();

  useEffect(() => {
    if (!initialized) return;
    if (!authUser) {
      navigate({
        to: "/register",
        search: { redirect: "/mentor/create-path" } as never,
        replace: true,
      });
      return;
    }
    if (!profileLoading && !isComplete) {
      toast.error("Please complete your required profile details first.");
      navigate({ to: "/settings/profile", replace: true });
    }
  }, [initialized, authUser, profileLoading, isComplete, navigate]);

  // Reset persisted listing draft state on explicit "Create New" entry
  // (?new=true and no ?draftId). MUST run BEFORE useMentorExpressStore()
  // subscription below so this render captures the cleared state — otherwise
  // child step components freeze stale initial* props in their own useState.
  // The mentor profile store (bio/intro) is intentionally NOT reset.
  useState(() => {
    if (isNew && !searchDraftId) {
      resetNewListingDraft();
    }
    return null;
  });
  const [emptyAlertDismissed, setEmptyAlertDismissed] = useState(false);

  // Narrow selectors so unrelated store updates don't re-render the whole page.
  const draftId = useMentorExpressStore((s) => s.draftId);
  const basics = useMentorExpressStore((s) => s.basics);
  const details = useMentorExpressStore((s) => s.details);
  const thumbnail = useMentorExpressStore((s) => s.thumbnail);
  const showcase = useMentorExpressStore((s) => s.showcase);
  const setBasics = useMentorExpressStore((s) => s.setBasics);
  const setDetails = useMentorExpressStore((s) => s.setDetails);
  const setThumbnail = useMentorExpressStore((s) => s.setThumbnail);
  const setDraftIdFn = useMentorExpressStore((s) => s.setDraftId);
  const hydrateFromDraft = useMentorExpressStore((s) => s.hydrateFromDraft);
  const resetDraft = useMentorExpressStore((s) => s.reset);
  const draft = {
    draftId,
    basics,
    details,
    thumbnail,
    showcase,
    setBasics,
    setDetails,
    setThumbnail,
    setDraftId: setDraftIdFn,
    hydrateFromDraft,
    reset: resetDraft,
  };

  const profileBio = useMentorProfileStore((s) => s.bio);
  const profileDisplayName = useMentorProfileStore((s) => s.displayName);
  const profilePhotoDataUrl = useMentorProfileStore((s) => s.photoDataUrl);
  const profileApplyBioToAll = useMentorProfileStore((s) => s.applyBioToAll);
  const profileSaveProfile = useMentorProfileStore((s) => s.saveProfile);
  const profile = {
    bio: profileBio,
    displayName: profileDisplayName,
    photoDataUrl: profilePhotoDataUrl,
    applyBioToAll: profileApplyBioToAll,
    saveProfile: profileSaveProfile,
  };

  const publish = useLessonPathsStore((s) => s.publish);
  const user = useAuthStore((s) => s.user);
  const publishJourneyFn = useServerFn(publishJourney);
  const upsertDraftFn = useServerFn(upsertJourneyDraft);
  const getDraftFn = useServerFn(getJourneyDraft);

  // Payments temporarily disabled — treat payout as ready so listings can publish.
  void getMyStripeIds;
  const isPayoutReady = true;

  const [step, setStep] = useState<CreationStep>(1);
  const [highest, setHighest] = useState<CreationStep>(1);
  const [submitting, setSubmitting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successKind, setSuccessKind] = useState<"pending" | "approved" | "link_review" | "critical_review">("pending");
  const [savedTick, setSavedTick] = useState(0);
  const [moderationFeedback, setModerationFeedback] = useState<string | null>(null);
  const [feedbackDismissed, setFeedbackDismissed] = useState(false);
  // Bumped on fresh-entry transitions to force step subtree to remount so
  // children re-read initial* from the cleared store.
  const [freshKey, setFreshKey] = useState(0);


  useEffect(() => {
    const handleNewListing = () => {
      resetNewListingDraft();
      setStep(1);
      setHighest(1);
      setSavedTick(0);
      setShowSuccess(false);
      setFreshKey((k) => k + 1);
    };

    window.addEventListener(MENTOR_EXPRESS_NEW_LISTING_EVENT, handleNewListing);
    return () => window.removeEventListener(MENTOR_EXPRESS_NEW_LISTING_EVENT, handleNewListing);
  }, []);

  // Same-route navigation (e.g. clicking "List Your AI Course" while already on
  // /mentor/create-path?draftId=...) doesn't remount the page, so the useState
  // initializer above doesn't re-run. Watch ?new=true transitions and reset.
  useEffect(() => {
    if (isNew && !searchDraftId) {
      resetNewListingDraft();
      setStep(1);
      setHighest(1);
      setSavedTick(0);
      setShowSuccess(false);
      setFreshKey((k) => k + 1);
    }
  }, [isNew, searchDraftId]);


  const goTo = (s: CreationStep) => {
    setStep(s);
    if (s > highest) setHighest(s);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  };

  // Resume an existing draft from My Listings.
  useEffect(() => {
    if (!searchDraftId || !user) return;
    let cancelled = false;
    (async () => {
      try {
        const row = await getDraftFn({ data: { id: searchDraftId } });
        if (cancelled || !row) return;
        const basics =
          row.title && row.category
            ? {
                title: row.title,
                category: row.category as string,
                experienceLevel: row.experience_level ?? null,
              }
            : undefined;
        const details = row.description
          ? {
              description: row.description,
              totalLessons: row.session_count,
              totalMentorSessions: row.session_count,
              durationWeeks: Math.max(1, Math.ceil(row.session_count / 2)),
              priceMajor: row.base_price_minor / 100,
              currency: row.currency as CurrencyCode,
              sessionTitles:
                row.session_titles && row.session_titles.length > 0
                  ? row.session_titles
                  : Array.from({ length: row.session_count }, () => ""),
              sessionDescriptions: row.session_descriptions ?? [],
              tags: row.tags ?? [],
              capacity: row.capacity,
              sessionLengthMinutes: row.session_length_minutes as 30 | 45 | 60 | 90,
            }
          : undefined;
        const showcase =
          row.showcase_video_url || row.showcase_audio_url || (row.showcase_images && row.showcase_images.length > 0) || row.featured_image_url
            ? {
                videoUrl: row.showcase_video_url ?? null,
                audioUrl: row.showcase_audio_url ?? null,
                images: (row.showcase_images ?? []).map((i, idx) => ({
                  url: i.url, storage_path: i.storage_path, sort_order: i.sort_order ?? idx,
                })),
                featuredImageUrl: row.featured_image_url ?? null,
              }
            : undefined;
        draft.hydrateFromDraft({
          draftId: row.id,
          basics,
          details,
          showcase,
          marketing: {},
        });
        if (row.cover_image_url) {
          draft.setThumbnail({ dataUrl: row.cover_image_url });
        }
        if (row.mentor_bio) {
          useMentorProfileStore.getState().saveProfile({ bio: row.mentor_bio });
        }
        const resumeStep: CreationStep = details ? 3 : basics ? 2 : row.mentor_bio ? 2 : 1;
        setStep(resumeStep);
        setHighest(resumeStep);

        if (row.status === "draft" && row.moderation_note && row.moderation_note.trim()) {
          setModerationFeedback(row.moderation_note);
          setFeedbackDismissed(false);
        } else {
          setModerationFeedback(null);
        }


      } catch (err) {
        console.error("[create-path] resume failed", err);
        toast.error("Couldn't load that draft.");
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraftId, user]);

  const saveDraft = async (fields: Record<string, unknown>) => {
    if (!user) return undefined;
    const wasNew = !draft.draftId;
    try {
      const res = await upsertDraftFn({
        data: { ...fields, id: draft.draftId },
      });
      if (wasNew) {
        draft.setDraftId(res.id);
        // Reflect the new draftId in the URL so refresh / back resumes the
        // same row and the ?new=true reset effect no longer fires.
        navigate({
          to: "/mentor/create-path",
          search: { draftId: res.id },
          replace: true,
        });
      }
      setSavedTick((t) => t + 1);
      return res.id;
    } catch (err) {
      console.error("[create-path] draft save failed", err);
      return undefined;
    }
  };


  const ensureDraftSaved = async (): Promise<string | undefined> => {
    const b = draft.basics;
    const d = draft.details;
    const fields: Record<string, unknown> = {
      title: b?.title,
      category: b?.category,
      experience_level: b?.experienceLevel ?? null,
    };
    if (d) {
      Object.assign(fields, {
        description: d.description,
        tags: d.tags,
        base_price_minor: Math.round(d.priceMajor * 100),
        currency: d.currency,
        session_count: d.totalMentorSessions,
        capacity: d.capacity,
        session_length_minutes: d.sessionLengthMinutes,
        session_titles: d.sessionTitles,
        session_descriptions: d.sessionDescriptions,
      });
    }
    const id = await saveDraft(fields);
    return id ?? draft.draftId ?? undefined;
  };

  const handleSubmitForApproval = async () => {
    if (!draft.basics || !draft.details) {
      goTo(1);
      return;
    }
    if (!user) {
      toast.error("Please log in to submit your Course.");
      navigate({ to: "/login" });
      return;
    }
    setSubmitting(true);

    let coverImageUrl: string | null = null;
    if (draft.thumbnail?.dataUrl) {
      // If it's already a public URL (autosaved), reuse it.
      if (/^https?:\/\//i.test(draft.thumbnail.dataUrl)) {
        coverImageUrl = draft.thumbnail.dataUrl;
      } else {
        try {
          const { uploadCoverImage } = await import("@/lib/cover-upload");
          const res = await fetch(draft.thumbnail.dataUrl);
          const blob = await res.blob();
          const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
          coverImageUrl = await uploadCoverImage(blob, ext, user.id, draft.draftId);
        } catch (err) {
          console.error("[create-path] cover upload failed", err);
        }
      }
    }

    try {
      const result = await publishJourneyFn({
        data: {
          id: draft.draftId,
          title: draft.basics.title,
          category: draft.basics.category,
          experience_level: draft.basics.experienceLevel ?? null,
          description: draft.details.description,
          tags: draft.details.tags ?? [],
          base_price_minor: Math.round(draft.details.priceMajor * 100),
          currency: draft.details.currency,
          session_count: draft.details.totalMentorSessions,
          extra_session_price_minor: 0,
          cover_image_url: coverImageUrl,
          capacity: draft.details.capacity,
          session_length_minutes: draft.details.sessionLengthMinutes,
          mentor_bio: profile.bio || null,
          session_titles: (draft.details.sessionTitles ?? []).map((t) => t.trim()).filter(Boolean),
          session_descriptions: (draft.details.sessionDescriptions ?? []).map((d) => d.trim()),
          apply_bio_to_all: !!profile.applyBioToAll,
          showcase_video_url: draft.showcase?.videoUrl ?? null,
          showcase_audio_url: draft.showcase?.audioUrl ?? null,
          showcase_images: draft.showcase?.images ?? [],
          featured_image_url: draft.showcase?.featuredImageUrl ?? null,
        },
      });
      if (result.moderation_status === "approved") {
        setSuccessKind("approved");
      } else if (result.review_reason === "link") {
        setSuccessKind("link_review");
      } else if (result.review_reason === "critical") {
        setSuccessKind("critical_review");
      } else {
        setSuccessKind("pending");
      }

      // Mirror into local store so the legacy /p/$slug fallback also works.
      publish({
        title: draft.basics.title,
        description: draft.details.description,
        category: draft.basics.category as JourneyCategory,
        priceMinor: Math.round(draft.details.priceMajor * 100),
        currency: draft.details.currency,
        thumbnailDataUrl: draft.thumbnail?.dataUrl,
        totalLessons: draft.details.totalLessons,
        totalMentorSessions: draft.details.totalMentorSessions,
        durationWeeks: draft.details.durationWeeks,
        sessionTitles: draft.details.sessionTitles,
      });

      window.dispatchEvent(new Event(ALERTS_CHANGED_EVENT));
      draft.reset();
      setShowSuccess(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not submit your Course.";
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (profileLoading) return null;
  if (!isComplete) return null;

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-border/60 bg-card/60 backdrop-blur">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-4 px-4 py-4">
          <Logo size="md" />
          {savedTick > 0 && (
            <span className="text-xs text-emerald-600">Saved as draft ✓</span>
          )}
        </div>
        <div className="mx-auto max-w-3xl px-4 pb-4">
          <CreationStepper
            current={step}
            highestVisited={highest}
            onJump={(s) => goTo(s)}
          />
        </div>
      </header>

      <main
        className={
          step === 4
            ? "mx-auto max-w-[1400px] px-4 md:px-8 py-8 md:py-12"
            : "mx-auto max-w-3xl px-4 py-8 md:py-12"
        }
      >
        {emptyFlag && !searchDraftId && !emptyAlertDismissed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 shadow-sm">
            <div className="flex-1 text-sm text-foreground">
              <p className="font-semibold">You haven't created any listings yet. Let's get started!</p>
              <p className="mt-1 text-muted-foreground">Fill in the steps below to publish your first AI course.</p>
              <Button
                size="sm"
                className="mt-3 text-white hover:opacity-90"
                style={{ backgroundColor: DESIGN_SYSTEM.colors.leafGreen }}
                onClick={() => {
                  setEmptyAlertDismissed(true);
                  document.querySelector("main")?.scrollIntoView({ behavior: "smooth" });
                }}
              >
                + Create New Listing
              </Button>
            </div>
            <button
              type="button"
              onClick={() => setEmptyAlertDismissed(true)}
              className="flex-shrink-0 rounded p-1 text-foreground/60 hover:bg-emerald-100"
              aria-label="Dismiss"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        {moderationFeedback && !feedbackDismissed && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 p-4 shadow-sm dark:border-amber-700/60 dark:bg-amber-950/30">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" aria-hidden />
            <div className="flex-1 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold">⚠️ Admin Review Feedback</p>
              <p className="mt-1 whitespace-pre-wrap leading-relaxed">{moderationFeedback}</p>
              <p className="mt-2 text-xs text-amber-800/80 dark:text-amber-200/80">
                Please address the feedback above, then re-submit your listing for approval.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setFeedbackDismissed(true)}
              className="flex-shrink-0 rounded p-1 text-amber-700 hover:bg-amber-100 dark:text-amber-300 dark:hover:bg-amber-900/40"
              aria-label="Dismiss feedback"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
        <div key={freshKey}>

        {(() => {
          const resolvedDisplayName =
            user?.displayName?.trim() ||
            profile.displayName ||
            user?.firstName ||
            "";
          const resolvedPhotoUrl =
            user?.avatarUrl ?? profile.photoDataUrl ?? null;
          const syncDisplayNameToProfile = async (newName: string) => {
            const trimmed = newName.trim();
            if (!user) return;
            if ((user.displayName ?? "") === trimmed) return;
            const { error } = await supabase
              .from("profiles")
              .update({ display_name: trimmed || null })
              .eq("id", user.id);
            if (error) {
              toast.error("Couldn't sync display name to your profile");
              return;
            }
            useAuthStore.getState().setDisplayName(trimmed || null);
          };
          const syncAvatarToProfile = async (photo: string | null) => {
            if (!user) return;
            // No change vs. what's already on the profile → skip.
            if (!photo || photo === user.avatarUrl) return;
            // Only fresh uploads (data URLs) need to go to storage.
            if (!photo.startsWith("data:")) return;
            try {
              const { uploadAvatarFromDataUrl } = await import(
                "@/lib/avatar-upload"
              );
              const { useProfileStore } = await import(
                "@/stores/useProfileStore"
              );
              const url = await uploadAvatarFromDataUrl(user.id, photo);
              const { error } = await supabase
                .from("profiles")
                .update({ avatar_url: url })
                .eq("id", user.id);
              if (error) throw error;
              useAuthStore.getState().setAvatarUrl(url);
              useProfileStore.getState().setProfile({ avatarUrl: url });
              // Replace the local data-URL cache with the canonical public URL
              // so the mentor-express store stops competing with profiles.avatar_url.
              profile.saveProfile({
                bio: profile.bio,
                displayName: profile.displayName,
                photoDataUrl: url,
                applyBioToAll: profile.applyBioToAll,
              });
            } catch (err) {
              console.error("[create-path] avatar sync failed", err);
              toast.error("Couldn't sync your photo to your profile");
            }
          };
          return step === 1 ? (
          <MentorIntroForm
            initialBio={profile.bio}
            initialDisplayName={resolvedDisplayName}
            initialPhotoDataUrl={resolvedPhotoUrl}
            initialApplyBioToAll={profile.applyBioToAll}
            onPhotoChange={(dataUrl) => { void syncAvatarToProfile(dataUrl); }}
            onSubmit={({ bio, displayName, photoDataUrl, applyBioToAll }) => {
              profile.saveProfile({ bio, displayName, photoDataUrl, applyBioToAll });
              void syncDisplayNameToProfile(displayName);
              void syncAvatarToProfile(photoDataUrl);
              void saveDraft({ mentor_bio: bio || null });
              goTo(2);
            }}

          />


        ) : step === 2 ? (
          <TitleCategoryStep
            key={`title-${freshKey}`}
            initialTitle={draft.basics?.title}
            initialCategory={draft.basics?.category}
            initialExperienceLevel={draft.basics?.experienceLevel ?? null}
            onCancel={() => goTo(1)}
            onNext={(b) => {
              draft.setBasics({
                title: b.title,
                category: b.category,
                experienceLevel: b.experienceLevel,
              });
              void saveDraft({
                title: b.title,
                category: b.category,
                experience_level: b.experienceLevel,
              });
              goTo(3);
            }}
          />
        ) : step === 3 ? (
          <StoryLogisticsStep
            key={`details-${freshKey}`}
            initial={draft.details}
            onBack={() => goTo(2)}
            onNext={(d) => {
              draft.setDetails(d);
              void saveDraft({
                title: draft.basics?.title,
                category: draft.basics?.category,
                experience_level: draft.basics?.experienceLevel ?? null,
                description: d.description,
                tags: d.tags,
                base_price_minor: Math.round(d.priceMajor * 100),
                currency: d.currency,
                session_count: d.totalMentorSessions,
                capacity: d.capacity,
                session_length_minutes: d.sessionLengthMinutes,
                session_titles: d.sessionTitles,
                session_descriptions: d.sessionDescriptions,
              });
              goTo(4);
            }}
          />
        ) : step === 4 && draft.basics && draft.details ? (
          <PreviewStep
            key={`preview-${freshKey}-${draft.basics.title}-${draft.thumbnail?.dataUrl ?? "placeholder"}`}
            basics={draft.basics}
            details={draft.details}
            thumbnailDataUrl={draft.thumbnail?.dataUrl}
            mentorName={resolvedDisplayName || "You"}
            mentorBio={profile.bio}
            mentorPhotoDataUrl={resolvedPhotoUrl ?? undefined}
            submitting={submitting}
            userId={user?.id}
            journeyId={draft.draftId}
            showcase={draft.showcase}
            onCoverChange={async (dataUrl) => {
              // Optimistic local update so the preview shows the new image immediately.
              draft.setThumbnail({ dataUrl });
              if (!user) {
                toast.error("Please log in to save your cover photo.");
                return;
              }
              try {
                // Ensure a draft row exists so we can attach the file to it.
                let draftId = draft.draftId;
                if (!draftId) {
                  draftId = await saveDraft({
                    title: draft.basics?.title,
                    category: draft.basics?.category,
                  });
                }
                const { uploadCoverImage } = await import("@/lib/cover-upload");
                const res = await fetch(dataUrl);
                const blob = await res.blob();
                const ext = (blob.type.split("/")[1] || "jpg").replace("jpeg", "jpg");
                const publicUrl = await uploadCoverImage(blob, ext, user.id, draftId);
                await saveDraft({ cover_image_url: publicUrl });
                // Swap the data URL for the persistent public URL.
                draft.setThumbnail({ dataUrl: publicUrl });
                toast.success("Cover photo saved");
              } catch (err) {
                console.error("[create-path] cover autosave failed", err);
                toast.error("Couldn't save cover photo. Please try again.");
              }
            }}
            onEditStep={(s) => goTo(s)}
            onBack={() => goTo(3)}
            onSubmit={handleSubmitForApproval}
          />
        ) : (
          <MentorIntroForm
            initialBio={profile.bio}
            initialDisplayName={resolvedDisplayName}
            initialPhotoDataUrl={resolvedPhotoUrl}
            initialApplyBioToAll={profile.applyBioToAll}
            onPhotoChange={(dataUrl) => { void syncAvatarToProfile(dataUrl); }}
            onSubmit={({ bio, displayName, photoDataUrl, applyBioToAll }) => {
              profile.saveProfile({ bio, displayName, photoDataUrl, applyBioToAll });
              void syncDisplayNameToProfile(displayName);
              void syncAvatarToProfile(photoDataUrl);
              void saveDraft({ mentor_bio: bio || null });
              goTo(2);
            }}

          />


        );
        })()}
        </div>
      </main>

      <Dialog open={showSuccess} onOpenChange={(open) => { if (!open) return; }}>
        <DialogContent
          className="sm:max-w-md text-center"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          {successKind === "pending" ? (
            isPayoutReady ? (
              <div className="flex flex-col items-center gap-4 pt-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  🎉 Congratulations, Your Listing is Submitted!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your listing has been successfully sent to our admin team for approval. Since your payout details are already set up, you are completely ready to start accepting payments the moment it goes live!
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => {
                    setShowSuccess(false);
                    navigate({ to: "/dashboard/aide" });
                  }}
                >
                  Go to Dashboard
                </Button>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-4 pt-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  🎉 Congratulations, Your Listing is Created!
                </h2>
                <p className="text-sm text-muted-foreground">
                  Your listing has been submitted for review. You'll get a status update from our admin team shortly.
                </p>
                <Button
                  className="mt-2 w-full"
                  onClick={() => {
                    setShowSuccess(false);
                    navigate({ to: "/dashboard/aide" });
                  }}
                >
                  Go to Dashboard
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSuccess(false);
                    navigate({ to: "/dashboard/aide" });
                  }}
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                >
                  Go to Dashboard (Skip for now)
                </button>
              </div>
            )
          ) : (
            <div className="flex flex-col items-center gap-4 pt-2">
              <div className="rounded-full bg-emerald-100 p-3">
                <CheckCircle2 className="size-16 text-emerald-500" strokeWidth={2.25} />
              </div>
              <h2 className="text-2xl font-bold tracking-tight">
                {successKind === "approved" ? "Changes Saved!" : "Submission Successful!"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {successKind === "approved"
                  ? "Your edits are live on your listing right now."
                  : successKind === "link_review"
                    ? "Your showcase link is being quickly reviewed by admin to ensure platform security. Your listing will appear live again shortly!"
                    : "Your price or category change is pending a quick admin review. Your listing will be back live shortly!"}
              </p>
              <Button
                className="mt-2 w-full"
                onClick={() => {
                  setShowSuccess(false);
                  navigate({ to: "/dashboard/aide" });
                }}
              >
                Back to Dashboard
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
