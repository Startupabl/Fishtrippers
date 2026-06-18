import { useEffect, useState } from "react";
import { createFileRoute, Link, notFound, redirect, isRedirect, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listPublicUpcomingCohorts } from "@/lib/bookings.functions";
import { ensureThreadForJourney } from "@/lib/messages.functions";
import { createCohortBookingCheckout } from "@/lib/cohorts.functions";
import { formatUtcInZone, tzAbbrev, resolveViewerTimezone } from "@/lib/tz";
import { Pencil, Clock, Camera, Sparkles, MessageCircle, ChevronDown, Eye, ArrowLeft, Trash2, CalendarPlus } from "lucide-react";
import { ScheduleLiveDateDialog } from "@/components/listings/ScheduleLiveDateDialog";
import { supabase } from "@/integrations/supabase/client";
import { setJourneyFeatured, deleteJourney } from "@/lib/admin.functions";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { SharePath } from "@/components/share/SharePath";
import { ListingReviews } from "@/components/reviews/ListingReviews";
import {
  getMentorBySlug,
  getPathBySlug,
  getJourneyThumbnail,
  formatJourneyDuration,
  type PathFixture,
  type MentorFixture,
} from "@/data/lesson-paths";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { JourneyThumbnail } from "@/components/listings/JourneyThumbnail";
import { SessionDescription } from "@/components/listings/SessionDescription";
import { useCurrencyStore, type CurrencyCode } from "@/stores/useCurrencyStore";
import { useLessonPathsStore } from "@/stores/useLessonPathsStore";
import { useMentorProfileStore } from "@/stores/useMentorProfileStore";
import { useAuthStore } from "@/stores/useAuthStore";
import { convertMinor } from "@/lib/currency";
import { formatCurrency } from "@/lib/format-currency";
import { displayMentorName } from "@/lib/mentor-display";
import { getJourneyBySlug, getMyJourneyBySlug, getAdminJourneyBySlug, updateJourney, type JourneyRow, type PortfolioAsset } from "@/lib/journeys.functions";
import { PortfolioSection } from "@/components/portfolio/PortfolioBentoGrid";
import { getPublicMentorProfile, type PublicMentorProfile } from "@/lib/mentor-profile.functions";
import { AvatarMottoTooltip } from "@/components/profile/AvatarMottoTooltip";
import { EditListingDrawer } from "@/components/listings/EditListingDrawer";
import { CoverCropperDialog } from "@/components/listings/CoverCropperDialog";
import { AvailabilityDrawer } from "@/components/availability/AvailabilityDrawer";
import { AvailabilityGrid } from "@/components/listings/AvailabilityGrid";
import { InquiryDialog } from "@/components/listings/InquiryDialog";
import { ExperienceLevelInline } from "@/components/listings/ExperienceLevelInline";
import { Badge } from "@/components/ui/badge";
import { useProfileGuard } from "@/components/onboarding/ProfileCompletionGuard";
import {
  getAvailabilityForMentor,
  type AvailabilityRow,
} from "@/lib/availability.functions";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { ReportListingDialog } from "@/components/listings/ReportListingDialog";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";


export const Route = createFileRoute("/c/$categorySlug/$listingSlug")({
  validateSearch: (search: Record<string, unknown>) => ({
    admin: search.admin === 1 || search.admin === "1" ? 1 : undefined,
  }),
  loader: async ({ params }) => {
    const path = getPathBySlug(params.listingSlug);
    if (path) {
      const mentor = getMentorBySlug(path.mentorSlug);
      if (!mentor) throw notFound();
      return { kind: "fixture" as const, path, mentor, slug: params.listingSlug, categorySlug: params.categorySlug };
    }
    // If this slug points at an operator (current or historical), 301 to /charters/...
    try {
      const { lookupOperatorRedirectBySlug } = await import("@/lib/operator-redirect.functions");
      const target = await lookupOperatorRedirectBySlug({ data: { slug: params.listingSlug } });
      if (target) {
        throw redirect({
          to: "/charters/$location/$businessSlug",
          params: { location: target.location, businessSlug: target.businessSlug },
          statusCode: 301,
          replace: true,
        });
      }
    } catch (e: unknown) {
      if (isRedirect(e)) throw e;
    }
    return { kind: "draft" as const, path: null, mentor: null, slug: params.listingSlug, categorySlug: params.categorySlug };
  },
  head: ({ loaderData, params }) => {
    const categorySlug = params?.categorySlug ?? loaderData?.categorySlug ?? "listings";
    const listingSlug = params?.listingSlug ?? loaderData?.slug ?? "";
    const origin =
      typeof window !== "undefined" ? window.location.origin : "https://fishtrippers.lovable.app";
    const canonicalUrl = `${origin}/c/${categorySlug}/${listingSlug}`;

    const baseMeta = [{ name: "robots", content: "index, follow" }];

    if (!loaderData?.path || !loaderData.mentor) {
      return {
        meta: baseMeta,
        links: [{ rel: "canonical", href: canonicalUrl }],
      };
    }
    const { path, mentor } = loaderData;
    const title = `${path.title} with ${displayMentorName(mentor.name)} — FishTrippers`;
    const tags = (path.tags ?? []).filter(Boolean);
    const tagSuffix = tags.length > 0 ? ` · Tags: ${tags.join(", ")}` : "";
    const description = (path.description.slice(0, 155) + tagSuffix).slice(0, 200);
    const ogTitle = `${path.title} with ${displayMentorName(mentor.name)}`;

    return {
      meta: [
        ...baseMeta,
        { title },
        { name: "description", content: description },
        ...(tags.length > 0
          ? [{ name: "keywords", content: tags.join(", ") }]
          : []),
        { property: "og:type", content: "product" },
        { property: "og:title", content: ogTitle },
        { property: "og:description", content: description },
        { property: "og:image", content: path.coverImage },
        { property: "og:image:alt", content: `${displayMentorName(mentor.name)} — ${path.title}` },
        { property: "og:url", content: canonicalUrl },
        { property: "og:site_name", content: "FishTrippers" },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: ogTitle },
        { name: "twitter:description", content: description },
        { name: "twitter:image", content: path.coverImage },
      ],
      links: [{ rel: "canonical", href: canonicalUrl }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Product",
            name: path.title,
            image: path.coverImage,
            description,
            brand: { "@type": "Brand", name: "FishTrippers" },
            offers: {
              "@type": "Offer",
              url: `${origin}/checkout?path=${path.slug}`,
              priceCurrency: path.currency,
              price: (path.priceMinor / 100).toFixed(2),
              availability: "https://schema.org/InStock",
            },
          }),
        },
      ],
    };
  },
  component: PathPage,
});

interface DisplayMentor {
  slug?: string;
  name: string;
  avatarUrl: string;
  bio: string;
  tagline?: string;
  motto?: string | null;
}

interface SyllabusItem {
  title: string;
  description: string;
}

interface DisplayPath {
  id: string;
  slug: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  thumbnail: string;
  syllabus: string[];
  syllabusItems: SyllabusItem[];
  durationLine: string;
  isFixture: boolean;
  sessionCount?: number;
  sessionLengthMinutes?: number;
  capacity?: number;
  tags?: string[];
  category?: string;
  subcategory?: string | null;
  experience_level?: "Beginner" | "Intermediate" | "Advanced" | null;
}

function fixtureToDisplay(path: PathFixture, mentor: MentorFixture) {
  return {
    path: {
      id: path.id,
      slug: path.slug,
      title: path.title,
      description: path.description,
      priceMinor: path.priceMinor,
      currency: path.currency,
      thumbnail: getJourneyThumbnail(path),
      syllabus: path.syllabus,
      syllabusItems: path.syllabus.map((t) => ({ title: t, description: "" })),
      durationLine: formatJourneyDuration(path),
      isFixture: true,
      sessionCount: path.totalMentorSessions ?? 1,
      sessionLengthMinutes: 45,
      capacity: 1,
      tags: path.tags ?? [],
      category: path.category,
      subcategory: path.subcategory ?? null,
    } as DisplayPath,
    mentor: {
      slug: mentor.slug,
      name: mentor.name,
      avatarUrl: mentor.avatarUrl,
      bio: mentor.bio,
      tagline: mentor.tagline,
    } as DisplayMentor,
  };
}

function PathPage() {
  const data = Route.useLoaderData();
  const userPath = useLessonPathsStore((s) =>
    data.kind === "draft" ? s.getBySlug(data.slug) : undefined,
  );
  const profile = useMentorProfileStore();

  // Live DB lookup if no fixture and no local draft.
  const [dbJourney, setDbJourney] = useState<JourneyRow | null>(null);
  const [dbLoading, setDbLoading] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editInitialSection, setEditInitialSection] = useState<"basics" | "story" | "image">("basics");
  const [coverOpen, setCoverOpen] = useState(false);
  const [availabilityOpen, setAvailabilityOpen] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);
  const [availabilityVersion, setAvailabilityVersion] = useState(0);
  const [previewMode, setPreviewMode] = useState(false);
  const [mentorProfile, setMentorProfile] = useState<PublicMentorProfile | null>(null);
  const user = useAuthStore((s) => s.user);
  const search = Route.useSearch();
  const adminParam = search.admin === 1;
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminCheckDone, setAdminCheckDone] = useState(false);
  const [featuredLocal, setFeaturedLocal] = useState<boolean | null>(null);
  const navigate = useNavigate();
  const setFeaturedFn = useServerFn(setJourneyFeatured);
  const deleteJourneyFn = useServerFn(deleteJourney);
  const getBySlugFn = useServerFn(getJourneyBySlug);
  const getMyBySlugFn = useServerFn(getMyJourneyBySlug);
  const getAdminBySlugFn = useServerFn(getAdminJourneyBySlug);
  const getMentorFn = useServerFn(getPublicMentorProfile);
  const updateJourneyFn = useServerFn(updateJourney);

  useEffect(() => {
    let cancelled = false;
    if (!user || !adminParam) {
      setIsAdmin(false);
      setAdminCheckDone(true);
      return;
    }
    setAdminCheckDone(false);
    supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) {
          setIsAdmin(!!data);
          setAdminCheckDone(true);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [user, adminParam]);

  useEffect(() => {
    if (data.kind !== "draft") return;
    // If an admin preview is requested, wait until the admin role check has
    // resolved so we don't fall through to the public/owner branches with
    // isAdmin=false and prematurely render "Course not found".
    if (adminParam && !adminCheckDone) return;
    let cancelled = false;
    setDbLoading(true);
    getBySlugFn({ data: { slug: data.slug } })
      .then(async (row) => {
        if (cancelled) return;
        if (row) {
          setDbJourney(row);
          return;
        }
        // Public lookup returned nothing (e.g. pending moderation).
        // 1) Verified admin previewing via ?admin=1 → admin-only lookup.
        if (isAdmin) {
          try {
            const adminRow = await getAdminBySlugFn({ data: { slug: data.slug } });
            if (!cancelled) setDbJourney(adminRow);
            return;
          } catch (err) {
            console.error("[c.$listingSlug] getAdminJourneyBySlug failed", err);
          }
        }
        // 2) Signed-in viewer → try owner-scoped lookup.
        if (user) {
          try {
            const owned = await getMyBySlugFn({ data: { slug: data.slug } });
            if (!cancelled) setDbJourney(owned);
          } catch (err) {
            console.error("[c.$listingSlug] getMyJourneyBySlug failed", err);
            if (!cancelled) setDbJourney(null);
          }
        } else {
          setDbJourney(null);
        }
      })
      .catch((err) => {
        console.error("[c.$listingSlug] getJourneyBySlug failed", err);
        if (!cancelled) setDbJourney(null);
      })
      .finally(() => {
        if (!cancelled) setDbLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [data.kind, data.slug, getBySlugFn, getMyBySlugFn, getAdminBySlugFn, user, isAdmin, adminParam, adminCheckDone]);

  useEffect(() => {
    if (!dbJourney?.mentor_id) {
      setMentorProfile(null);
      return;
    }
    let cancelled = false;
    getMentorFn({ data: { user_id: dbJourney.mentor_id } })
      .then((p) => {
        if (!cancelled) setMentorProfile(p);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [dbJourney?.mentor_id, getMentorFn]);

  let display: { path: DisplayPath; mentor: DisplayMentor; dbJourneyId?: string } | null = null;

  if (data.kind === "fixture" && data.path && data.mentor) {
    display = fixtureToDisplay(data.path, data.mentor);
  } else if (dbJourney) {
    const cover =
      dbJourney.featured_image_url ||
      dbJourney.cover_image_url ||
      `https://api.dicebear.com/7.x/shapes/svg?seed=${encodeURIComponent(dbJourney.title)}`;
    const isOwner = !!user && user.id === dbJourney.mentor_id;
    display = {
      path: {
        id: dbJourney.id,
        slug: dbJourney.slug ?? "",
        title: dbJourney.title,
        description: dbJourney.description ?? "",
        priceMinor: dbJourney.base_price_minor,
        currency: dbJourney.currency,
        thumbnail: cover,
        syllabus: (dbJourney.session_titles ?? userPath?.sessionTitles ?? []).filter((t) => t.trim().length > 0),
        syllabusItems: (dbJourney.session_titles ?? []).map((title, i) => ({
          title,
          description: (dbJourney.session_descriptions ?? [])[i] ?? "",
        })).filter((it) => it.title.trim().length > 0),
        durationLine: `The Mix : ${dbJourney.session_count} live Guide session${dbJourney.session_count === 1 ? "" : "s"}`,
        isFixture: false,
        sessionCount: dbJourney.session_count,
        sessionLengthMinutes: dbJourney.session_length_minutes,
        capacity: dbJourney.capacity,
        tags: dbJourney.tags ?? [],
        category: dbJourney.category ?? undefined,
        subcategory: null,
        experience_level: dbJourney.experience_level ?? null,
      },
      mentor: {
        name:
          mentorProfile?.display_name?.trim() ||
          (() => {
            const full = [mentorProfile?.first_name, mentorProfile?.last_name]
              .filter(Boolean)
              .join(" ")
              .trim();
            return full ? displayMentorName(full) : "";
          })() ||
          (isOwner ? profile.displayName : "") ||
          "Your Guide",
        avatarUrl:
          mentorProfile?.avatar_url ||
          (isOwner ? profile.photoDataUrl : undefined) ||
          `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(mentorProfile?.display_name || mentorProfile?.first_name || "Guide")}`,
        bio:
          dbJourney.mentor_bio?.trim() ||
          mentorProfile?.bio?.trim() ||
          (isOwner ? profile.bio?.trim() : "") ||
          "Guide bio coming soon.",
        motto: mentorProfile?.motto ?? null,
      },
      dbJourneyId: dbJourney.id,
    };
  } else if (data.kind === "draft" && userPath) {
    const fallbackThumb =
      userPath.thumbnailDataUrl ?? getJourneyThumbnail({} as PathFixture);
    display = {
      path: {
        id: userPath.id,
        slug: userPath.slug,
        title: userPath.title,
        description: userPath.description ?? "",
        priceMinor: userPath.priceMinor ?? 0,
        currency: userPath.currency ?? "USD",
        thumbnail: fallbackThumb,
        syllabus: userPath.sessionTitles?.filter((t) => t.trim().length > 0) ?? [],
        syllabusItems: (userPath.sessionTitles ?? []).filter((t) => t.trim().length > 0).map((title) => ({ title, description: "" })),
        durationLine: `Includes ${userPath.totalLessons ?? 4} trips + ${
          userPath.totalMentorSessions ?? 1
        } guide sessions over ${userPath.durationWeeks ?? 2} weeks`,
        isFixture: false,
        sessionCount: userPath.totalMentorSessions ?? 1,
        sessionLengthMinutes: 45,
        capacity: 1,
        tags: [],
        category: userPath.category,
        subcategory: null,
      },
      mentor: {
        name: profile.displayName || "You",
        avatarUrl:
          profile.photoDataUrl ??
          "https://api.dicebear.com/7.x/initials/svg?seed=" +
            encodeURIComponent(profile.displayName || "You"),
        bio: profile.bio || "Bio coming soon.",
      },
    };
  }

  if (dbLoading && !display) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading Trip…
      </div>
    );
  }

  // Don't show "not found" until the admin-preview check has resolved —
  // otherwise admins briefly see the not-found screen while the role check
  // and admin-scoped lookup are still in flight.
  if (!display && adminParam && !adminCheckDone) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center text-sm text-muted-foreground">
        Loading Trip…
      </div>
    );
  }

  if (!display) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <h1
          className="text-2xl text-foreground"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Fishing trip not found
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This Fishing Trip may have been removed, or the link is incorrect.
        </p>
        <div className="mt-6">
          <Button asChild variant="info">
            <Link to="/">Back home</Link>
          </Button>
        </div>
      </div>
    );
  }

  const { path, mentor } = display;
  const categorySlugForUrl =
    (data.kind === "fixture" && data.path?.category
      ? data.path.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
      : dbJourney?.category
        ? dbJourney.category.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        : "listings") || "listings";
  const url =
    typeof window !== "undefined"
      ? `${window.location.origin}/c/${categorySlugForUrl}/${path.slug}`
      : `/c/${categorySlugForUrl}/${path.slug}`;

  const serif = { fontFamily: 'Montserrat, "Inter", system-ui, sans-serif', fontWeight: 700 };

  const isOwner = !!user && !!dbJourney && user.id === dbJourney.mentor_id;
  const isAdminAudit = isAdmin && !!dbJourney;
  const canManage = isOwner || isAdminAudit;
  const effectiveIsOwner = isOwner && !previewMode;
  const menuItemStyle: React.CSSProperties = { fontFamily: "Inter, system-ui, sans-serif", fontSize: 18 };

  const featuredCurrent =
    featuredLocal !== null ? featuredLocal : !!dbJourney?.featured;

  const handleToggleFeatured = async (next: boolean) => {
    if (!dbJourney) return;
    setFeaturedLocal(next);
    try {
      await setFeaturedFn({ data: { journeyId: dbJourney.id, featured: next } });
      toast.success(next ? "Listing featured" : "Removed from featured");
    } catch (err) {
      setFeaturedLocal(!next);
      toast.error(err instanceof Error ? err.message : "Could not update featured");
    }
  };

  const handleAdminDelete = async () => {
    if (!dbJourney) return;
    if (!window.confirm(`Delete "${dbJourney.title}"? This cannot be undone.`)) return;
    try {
      await deleteJourneyFn({ data: { journeyId: dbJourney.id } });
      toast.success("Listing deleted");
      navigate({ to: "/admin/listings" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not delete listing");
    }
  };

  return (
    <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-10">
      {isAdminAudit && dbJourney && (
        <div
          className="sticky top-0 z-50 -mx-4 md:-mx-8 mb-4 flex flex-wrap items-center justify-between gap-3 px-4 py-2 text-white shadow-md"
          style={{ backgroundColor: "#0A2540" }}
        >
          <div className="flex items-center gap-3">
            <Link
              to="/admin/queue"
              search={{ tab: "listings" as const }}
              className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-medium hover:bg-white/25"
            >
              <ArrowLeft className="size-3.5" /> Back to Admin Queue
            </Link>
            <Link
              to="/admin/listings"
              className="inline-flex items-center gap-1 rounded-md bg-white/15 px-2 py-1 text-xs font-medium hover:bg-white/25"
            >
              <ArrowLeft className="size-3.5" /> Back to Listings
            </Link>
            <span className="text-xs font-bold uppercase tracking-wider">
              Admin Audit · {dbJourney.course_id_slug}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <label className="inline-flex items-center gap-2 text-xs font-medium">
              Feature this listing
              <Switch checked={featuredCurrent} onCheckedChange={handleToggleFeatured} />
            </label>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => setEditOpen(true)}
              className="h-8"
            >
              <Pencil className="size-3.5" /> Edit Listing
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={handleAdminDelete}
              className="h-8"
            >
              <Trash2 className="size-3.5" /> Delete
            </Button>
          </div>
        </div>
      )}
      {isOwner && previewMode && (
        <div className="sticky top-0 z-50 -mx-4 mb-4 flex items-center justify-between gap-3 bg-foreground px-4 py-2 text-background">
          <span style={{ fontFamily: "Inter, system-ui, sans-serif", fontSize: 14 }}>
            Preview Mode: This is how Learners see your page.
          </span>
          <Button size="sm" variant="secondary" onClick={() => setPreviewMode(false)}>
            Back to Editor
          </Button>
        </div>
      )}
      {effectiveIsOwner && dbJourney && (
        <div className="mb-4 flex flex-wrap justify-end gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                className="rounded-2xl text-white hover:opacity-90"
                style={{ backgroundColor: "#0A2540" }}
              >
                Manage Listing
                <ChevronDown className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-56">
              <DropdownMenuItem asChild style={menuItemStyle}>
                <Link to="/create-listing/new" search={{ draftId: dbJourney.id }}>
                  <Pencil className="size-4" />
                  Edit Listing
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => setAvailabilityOpen(true)} style={menuItemStyle}>
                <Clock className="size-4" />
                Manage Availability
              </DropdownMenuItem>
              <DropdownMenuItem asChild style={menuItemStyle}>
                <Link
                  to="/dashboard/listings/$journeyId/showcase"
                  params={{ journeyId: dbJourney.id }}
                >
                  <Sparkles className="size-4" />
                  {(dbJourney.portfolio_assets?.length ?? 0) === 0 && !dbJourney.showcase_intro
                    ? "Add Your Showcase"
                    : "Edit Your Showcase"}
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => setPreviewMode(true)} style={menuItemStyle}>
                <Eye className="size-4" />
                View as Angler
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            type="button"
            variant="info"
            className="rounded-2xl"
            onClick={() => setScheduleOpen(true)}
          >
            <CalendarPlus className="size-4" />
            Schedule Live Date
          </Button>
        </div>
      )}
      <ScheduleLiveDateDialog
        row={
          scheduleOpen && dbJourney
            ? {
                id: dbJourney.id,
                title: dbJourney.title,
                base_price_minor: dbJourney.base_price_minor,
                currency: dbJourney.currency,
                moderation_status: dbJourney.moderation_status,
              }
            : null
        }
        onOpenChange={(o) => !o && setScheduleOpen(false)}
      />


      <div className="md:relative">
        <div className="relative overflow-hidden rounded-2xl">
          <JourneyThumbnail
            src={path.thumbnail}
            alt={path.title}
            className="aspect-[4/3] w-full md:aspect-[851/315]"
          />
          {/* Gradient scrim for legibility on any cover photo — desktop overlay only */}
          <div
            className="pointer-events-none absolute inset-0 hidden bg-gradient-to-t from-black/70 via-black/30 to-transparent md:block"
            aria-hidden="true"
          />
          {effectiveIsOwner && dbJourney && user && (
            <button
              type="button"
              onClick={() => setCoverOpen(true)}
              className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-background/90 px-3 py-1.5 text-xs font-medium text-foreground shadow-sm backdrop-blur transition-colors hover:bg-background"
            >
              <Camera className="size-3.5" />
              Change cover photo
            </button>
          )}
          {/* Title + Aide overlay — desktop only, left-aligned with card titles below (p-6) */}
          <div className="absolute inset-x-0 bottom-0 hidden flex-col items-start gap-1 p-6 md:flex">
            <h1
              className="text-2xl md:text-3xl font-bold text-white md:max-w-3xl text-balance"
              style={{
                ...serif,
                textShadow:
                  "0 2px 12px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              {path.title}
            </h1>

            <p
              className="text-base md:text-lg text-white"
              style={{
                textShadow:
                  "0 2px 12px rgba(0,0,0,0.55), 0 1px 2px rgba(0,0,0,0.6)",
              }}
            >
              with{" "}
              {mentor.slug ? (
                <Link
                  to="/m/$mentorSlug"
                  params={{ mentorSlug: mentor.slug }}
                  className="font-semibold text-white underline-offset-2 hover:underline"
                >
                  {displayMentorName(mentor.name)}
                </Link>
              ) : (
                <span className="font-semibold text-white">
                  {displayMentorName(mentor.name)}
              </span>
            )}
          </p>
        </div>
        </div>
        {/* Mobile-only stacked title — always visible below the cover image */}
        <div className="mt-4 flex flex-col items-start gap-1 md:hidden">
          <h1
            className="text-2xl font-bold text-foreground text-balance"
            style={serif}
          >
            {path.title}
          </h1>
          <p className="text-base text-foreground">
            with{" "}
            {mentor.slug ? (
              <Link
                to="/m/$mentorSlug"
                params={{ mentorSlug: mentor.slug }}
                className="font-semibold underline-offset-2 hover:underline"
              >
                {displayMentorName(mentor.name)}
              </Link>
            ) : (
              <span className="font-semibold">
                {displayMentorName(mentor.name)}
              </span>
            )}
          </p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* RIGHT COLUMN — 2/3 */}
        <div className="space-y-6 lg:col-span-2 lg:order-1">
          {/* About This Course */}
          <section className="rounded-2xl border border-border bg-card p-6">
            <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={serif}>
              Trip Description
            </h2>
            {(path.category || path.experience_level) && (
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {path.category && (
                  <Badge variant="secondary" className="capitalize">
                    {path.category}
                  </Badge>
                )}
                {path.category && path.experience_level && (
                  <span aria-hidden className="text-muted-foreground">•</span>
                )}
                <ExperienceLevelInline level={path.experience_level} />
              </div>
            )}
            <p
              className="mt-3"
              style={{ fontSize: "18px", lineHeight: 1.6, color: "#222222" }}
            >
              {path.description}
            </p>
            {(path.tags?.length ?? 0) > 0 && (
              <div className="mt-4 flex flex-wrap gap-1.5">
                {path.tags!.map((t) => (
                  <Badge key={t} variant="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            )}
          </section>

          {path.syllabusItems.length > 0 && (
            <section className="rounded-2xl border border-border bg-card p-6">
              <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={serif}>
                What We'll Cover
              </h2>
              <p
                className="mt-2 italic text-foreground/80"
                style={{ fontSize: "17px", lineHeight: 1.5 }}
              >
                {path.durationLine}
              </p>
              <SyllabusList
                items={path.syllabusItems}
                isOwner={effectiveIsOwner && !!dbJourney}
                onSaveDescription={
                  effectiveIsOwner && dbJourney
                    ? async (index, description) => {
                        const titles = dbJourney.session_titles ?? [];
                        const current = dbJourney.session_descriptions ?? [];
                        const next = Array.from({ length: titles.length }, (_, i) =>
                          i === index ? description : current[i] ?? "",
                        );
                        try {
                          const { row: updated } = await updateJourneyFn({
                            data: { id: dbJourney.id, session_descriptions: next },
                          });
                          setDbJourney(updated);
                        } catch (err) {
                          console.error("[p.$pathSlug] save description failed", err);
                          toast.error("Couldn't save the description. Please try again.");
                          throw err;
                        }
                      }
                    : undefined
                }
              />
            </section>
          )}

          {dbJourney && (dbJourney.portfolio_assets?.length ?? 0) > 0 && (
            <PortfolioSection
              journeyId={dbJourney.id}
              firstName={(mentor.name || "Guide").split(" ")[0] || "Guide"}
              assets={(dbJourney.portfolio_assets ?? []) as PortfolioAsset[]}
              intro={dbJourney.showcase_intro ?? null}
            />
          )}

          <PathContentBlock
            path={path}
            mentor={mentor}
            serif={serif}
            journeyId={display.dbJourneyId}
            mentorUserId={dbJourney?.mentor_id}
            previewMode={previewMode}
            showBioNudge={!!dbJourney && effectiveIsOwner && !dbJourney.mentor_bio?.trim()}
            onAddBio={() => {
              setEditInitialSection("story");
              setEditOpen(true);
            }}
          />




          {/* Reviews */}
          {dbJourney?.id && (
            <div className="pt-4">
              <ListingReviews listingId={dbJourney.id} />
            </div>
          )}

          {/* Social Links */}
          <div className="pt-4">
            <SharePath
              url={url}
              title={path.title}
              mentorName={displayMentorName(mentor.name)}
              compact
            />
          </div>
        </div>

        {/* LEFT COLUMN — 1/3 (sticky on desktop) */}
        <aside className="space-y-6 lg:col-span-1 lg:order-2 lg:sticky lg:top-24 lg:self-start">
          <PathBookingSidebar
            path={path}
            mentor={mentor}
            serif={serif}
            dbJourneyId={display.dbJourneyId}
            mentorUserId={dbJourney?.mentor_id}
            mentorCountry={mentorProfile?.country ?? null}
            mentorTimezone={mentorProfile?.timezone ?? null}
            availabilityVersion={availabilityVersion}
            previewMode={previewMode}
          />
          {display.dbJourneyId && (
            <div className="flex justify-end pt-2">
              <ReportListingDialog listingId={display.dbJourneyId} />
            </div>
          )}
        </aside>
      </div>

      {canManage && dbJourney && user && (
        <>
          <EditListingDrawer
            open={editOpen}
            onOpenChange={setEditOpen}
            journey={dbJourney}
            onSaved={(row) => setDbJourney(row)}
            initialSection={editInitialSection}
          />
          <AvailabilityDrawer
            open={availabilityOpen}
            onOpenChange={setAvailabilityOpen}
            onSaved={() => setAvailabilityVersion((v) => v + 1)}
          />
          <CoverCropperDialog
            open={coverOpen}
            onOpenChange={setCoverOpen}
            userId={user.id}
            journeyId={dbJourney.id}
            onUploaded={async (publicUrl) => {
              try {
                const { row } = await updateJourneyFn({
                  data: { id: dbJourney.id, cover_image_url: publicUrl },
                });
                setDbJourney(row);
              } catch (err) {
                toast.error(err instanceof Error ? err.message : "Could not update cover");
              }
            }}
          />
        </>
      )}
    </div>
  );
}

function PathContentBlock({
  path: _path,
  mentor,
  serif,
  journeyId,
  mentorUserId,
  previewMode,
  showBioNudge,
  onAddBio,
}: {
  path: DisplayPath;
  mentor: DisplayMentor;
  serif: React.CSSProperties;
  journeyId?: string;
  mentorUserId?: string;
  previewMode?: boolean;
  showBioNudge?: boolean;
  onAddBio?: () => void;
}) {
  void _path;
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const ensureThreadFn = useServerFn(ensureThreadForJourney);
  const { guard, dialog: profileGuardDialog } = useProfileGuard();
  const [starting, setStarting] = useState(false);

  const firstName = (mentor.name || "Guide").trim().split(/\s+/)[0] || "Guide";
  const isOwner = !!user && !!mentorUserId && user.id === mentorUserId && !previewMode;
  const canContact = !!journeyId && !isOwner;

  async function handleContact() {
    if (!journeyId || starting) return;
    setStarting(true);
    try {
      const { thread_id } = await ensureThreadFn({ data: { journey_id: journeyId } });
      navigate({ to: "/dashboard/messages/$threadId", params: { threadId: thread_id } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not start conversation.");
    } finally {
      setStarting(false);
    }
  }

  return (
    <>
      {/* About the Aide */}
      <section className="rounded-2xl border border-border bg-card p-6">
        <h2 className="text-2xl md:text-3xl font-bold text-foreground" style={serif}>
          About the Guide
        </h2>
        {showBioNudge && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
            <span>
              Your About the Guide section is empty. Add a short intro so anglers know who they're booking.
            </span>
            <Button size="sm" variant="outline" onClick={() => onAddBio?.()}>
              Add your bio
            </Button>
          </div>
        )}
        <div className="mt-4 flex items-start gap-4">
          <AvatarMottoTooltip motto={mentor.motto ?? null}>
            <img
              src={mentor.avatarUrl}
              alt={displayMentorName(mentor.name)}
              className="size-20 shrink-0 rounded-full object-cover ring-4 ring-background shadow-md"
            />
          </AvatarMottoTooltip>
          <div className="min-w-0">
            {mentor.slug ? (
              <Link
                to="/m/$mentorSlug"
                params={{ mentorSlug: mentor.slug }}
                className="text-lg font-medium text-foreground hover:underline"
              >
                {displayMentorName(mentor.name)}
              </Link>
            ) : (
              <span className="text-lg font-medium text-foreground">
                {displayMentorName(mentor.name)}
              </span>
            )}
            {mentor.tagline && (
              <p className="mt-1 text-sm italic text-muted-foreground">{mentor.tagline}</p>
            )}
            <p className="mt-3 text-base md:text-lg text-foreground">{mentor.bio}</p>
          </div>
        </div>
        {canContact && (
          <div className="mt-5">
            <Button
              variant="outline"
              size="sm"
              onClick={guard(() => { void handleContact(); })}
              disabled={starting}
            >
              <MessageCircle className="size-4" />
              {starting ? "Opening…" : `Contact ${firstName}`}
            </Button>
          </div>
        )}
      </section>
      {profileGuardDialog}
    </>
  );
}

function PathBookingSidebar({
  path,
  mentor,
  dbJourneyId,
  mentorUserId,
  mentorCountry,
  mentorTimezone,
  availabilityVersion,
  previewMode,
}: {
  path: DisplayPath;
  mentor: DisplayMentor;
  serif: React.CSSProperties;
  dbJourneyId?: string;
  mentorUserId?: string;
  mentorCountry?: string | null;
  mentorTimezone?: string | null;
  availabilityVersion?: number;
  previewMode?: boolean;
}) {
  const [availability, setAvailability] = useState<AvailabilityRow | null>(null);
  const [inquiryOpen, setInquiryOpen] = useState(false);
  const display = useCurrencyStore((s) => s.currency);
  const user = useAuthStore((s) => s.user);
  const fetchAvailability = useServerFn(getAvailabilityForMentor);
  const { guard, dialog: profileGuardDialog } = useProfileGuard();

  useEffect(() => {
    if (!mentorUserId) {
      setAvailability(null);
      return;
    }
    let cancelled = false;
    fetchAvailability({ data: { mentor_id: mentorUserId } })
      .then((row) => {
        if (!cancelled) setAvailability(row);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [mentorUserId, availabilityVersion, fetchAvailability]);

  const paused = !!availability?.paused;
  const totalMinor = path.priceMinor;
  const isOwner = !!user && !!mentorUserId && user.id === mentorUserId && !previewMode;
  const sessionCount = path.sessionCount ?? 1;
  const sessionLengthMinutes = path.sessionLengthMinutes ?? 45;
  const capacity = path.capacity ?? 1;

  const fmt = (m: number) =>
    formatCurrency(convertMinor(m, path.currency as CurrencyCode, display), display);

  return (
    <>
      {/* 1. Price */}
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2
          className="text-2xl md:text-3xl font-bold text-foreground"
          style={{ fontFamily: "Montserrat, ui-sans-serif, sans-serif" }}
        >
          Price
        </h2>
        <p className="mt-3 text-2xl md:text-3xl font-bold" style={{ color: "#1F6B36" }}>{fmt(totalMinor)}</p>
        <p className="text-sm" style={{ color: "#1F6B36" }}>Per Person</p>

        <Separator className="my-4" />

        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Includes
        </h3>
        <ul className="mt-2 space-y-1.5 text-[16px] text-foreground">
          <li>
            <strong>{sessionCount}</strong> Session{sessionCount === 1 ? "" : "s"}
          </li>
          <li>
            <strong>{sessionLengthMinutes}</strong> Minutes each
          </li>
          <li>
            {capacity === 1 ? (
              <>Private <strong>1-on-1</strong> Session</>
            ) : (
              <>Small Group: Up to <strong>{capacity}</strong> people</>
            )}
          </li>
        </ul>

        {dbJourneyId && (
          <>
            <Separator className="my-4" />
            <HowBookingsWorkAccordion courseId={dbJourneyId} />
          </>
        )}
      </div>


      {/* 2. Upcoming Live Sessions (own card, only when cohorts exist) */}
      {dbJourneyId && (
        <UpcomingCohortSessions
          courseId={dbJourneyId}
          fallbackPriceMinor={path.priceMinor}
          fallbackCurrency={path.currency}
          isOwner={isOwner}
        />
      )}

      {/* 3. General Availability (grid + Check Specific Dates) */}
      <section className="rounded-2xl border border-border bg-card p-5 space-y-4">
        <AvailabilityGrid
          slots={availability?.slots ?? null}
          paused={paused}
          country={mentorCountry ?? null}
          timezone={mentorTimezone ?? null}
          className="border-0 p-0 rounded-none"
        />


        {!paused && dbJourneyId && (
          <div className="flex flex-col gap-1">
            <Button
              size="lg"
              onClick={guard(() => setInquiryOpen(true))}
              disabled={isOwner}
              title={isOwner ? "This is what learners see" : undefined}
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
            {isOwner && (
              <p className="text-base text-foreground">
                This is what learners see — they'll message you here.
              </p>
            )}
          </div>
        )}
        {paused && (
          <p className="text-sm text-muted-foreground">
            This Guide is currently paused. Check back soon!
          </p>
        )}
      </section>





      {dbJourneyId && (
        <InquiryDialog
          open={inquiryOpen}
          onOpenChange={setInquiryOpen}
          journeyId={dbJourneyId}
          journeyTitle={path.title}
          mentorName={displayMentorName(mentor.name)}
        />
      )}
      {profileGuardDialog}
    </>
  );
}


interface SyllabusListProps {
  items: SyllabusItem[];
  isOwner: boolean;
  onSaveDescription?: (index: number, description: string) => Promise<void>;
}

function SyllabusList({ items, isOwner, onSaveDescription }: SyllabusListProps) {
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const beginEdit = (i: number, current: string) => {
    if (!isOwner || !onSaveDescription) return;
    setEditingIndex(i);
    setDraft(current);
  };

  const cancel = () => {
    setEditingIndex(null);
    setDraft("");
  };

  const commit = async (i: number) => {
    if (!onSaveDescription) return;
    const trimmed = draft.trim();
    setSaving(true);
    try {
      await onSaveDescription(i, trimmed);
      setEditingIndex(null);
      setDraft("");
    } catch {
      // toast handled upstream; keep editor open
    } finally {
      setSaving(false);
    }
  };

  return (
    <ul className="mt-4 space-y-3">
      {items.map((item, i) => {
        const isEditing = editingIndex === i;
        const hasDescription = item.description.trim().length > 0;
        return (
          <li
            key={`${i}-${item.title}`}
            className="rounded-2xl border border-border bg-card p-4 md:p-5 text-foreground"
          >
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Session {i + 1}
            </p>
            <p className="mt-1 text-base font-semibold text-foreground md:text-lg">
              {item.title}
            </p>
            {(hasDescription || (isOwner && onSaveDescription)) && (
              <div className="mt-2">
                {isEditing ? (
                  <div className="space-y-2">
                    <Textarea
                      autoFocus
                      value={draft}
                      onChange={(e) => setDraft(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Escape") {
                          e.preventDefault();
                          cancel();
                        } else if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
                          e.preventDefault();
                          void commit(i);
                        }
                      }}
                      onBlur={() => void commit(i)}
                      rows={3}
                      maxLength={600}
                      placeholder="e.g., We'll start with a safety check and then dive into our first race car mission!"
                      className="rounded-lg text-sm"
                      disabled={saving}
                    />
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Press ⌘/Ctrl+Enter to save · Esc to cancel</span>
                    </div>
                  </div>
                ) : isOwner && onSaveDescription ? (
                  hasDescription ? (
                    <button
                      type="button"
                      onClick={() => beginEdit(i, item.description)}
                      className="block w-full text-left hover:opacity-80 transition-opacity"
                    >
                      <SessionDescription text={item.description} />
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => beginEdit(i, "")}
                      className="text-xs font-medium text-info hover:underline"
                    >
                      + Add description
                    </button>
                  )
                ) : (
                  <SessionDescription text={item.description} />
                )}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function UpcomingCohortSessions({
  courseId,
  fallbackPriceMinor,
  fallbackCurrency,
  isOwner,
}: {
  courseId: string;
  fallbackPriceMinor: number;
  fallbackCurrency: string;
  isOwner: boolean;
}) {
  const fetchUpcoming = useServerFn(listPublicUpcomingCohorts);
  const bookSeat = useServerFn(createCohortBookingCheckout);
  const user = useAuthStore((s) => s.user);
  const navigate = useNavigate();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [bookingId, setBookingId] = useState<string | null>(null);

  const { data: cohorts } = useQuery({
    queryKey: ["public-upcoming-cohorts", courseId],
    queryFn: () => fetchUpcoming({ data: { course_id: courseId } }),
    staleTime: 60_000,
  });

  if (!cohorts || cohorts.length === 0) return null;

  const viewerTz = resolveViewerTimezone(null);
  const fmtSlot = (iso: string, duration: number) => {
    const when = formatUtcInZone(iso, viewerTz, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
    const abbrev = tzAbbrev(viewerTz, new Date(iso));
    return `${when}${abbrev ? ` ${abbrev}` : ""} · ${duration} min`;
  };

  const handleBook = async (classSessionId: string) => {
    if (!user) {
      const next = encodeURIComponent(window.location.pathname);
      navigate({ to: "/login", search: { next } as never });
      return;
    }
    try {
      setBookingId(classSessionId);
      const res = await bookSeat({ data: { class_session_id: classSessionId } });
      if (res?.booking_id) {
        navigate({ to: "/booking-review", search: { bookingId: res.booking_id } });
      } else {
        toast.error("Could not start checkout.");
        setBookingId(null);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not book seat.");
      setBookingId(null);
    }
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <h2
        className="text-2xl font-bold text-foreground md:text-3xl"
        style={{ fontFamily: DESIGN_SYSTEM.fonts.serif }}
      >
        Upcoming Live Sessions
      </h2>

      <ul className="mt-3 space-y-3">
        {cohorts.map((c) => {
          const title = c.cohort_title ?? "Live Cohort";
          const priceMinor = c.price_minor ?? fallbackPriceMinor;
          const currency = c.currency ?? fallbackCurrency;
          const priceLabel = formatCurrency(priceMinor, currency);
          const isSoldOut = c.seats_left <= 0;
          const seatsLabel = isSoldOut
            ? "Sold out"
            : c.seats_left === 1
              ? "Last seat"
              : `${c.seats_left} seats remaining`;
          const first = c.slots[0];
          const isOpen = !!expanded[c.class_session_id];
          const isSubmitting = bookingId === c.class_session_id;

          return (
            <li
              key={c.class_session_id}
              className="rounded-lg border border-border bg-card p-3"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-foreground">{title}</span>
                    {c.slots.length > 1 && (
                      <Badge variant="secondary" className="text-xs">
                        {c.slots.length} Sessions Total
                      </Badge>
                    )}
                  </div>
                  <div className="mt-1 text-sm text-foreground">
                    {fmtSlot(first.starts_at, first.duration_minutes)}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {priceLabel}
                    </span>
                    <span>{seatsLabel}</span>
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <Button
                    size="sm"
                    variant={isSoldOut ? "secondary" : "default"}
                    onClick={() => handleBook(c.class_session_id)}
                    disabled={isOwner || isSubmitting || isSoldOut}
                    title={isOwner ? "This is what learners see" : undefined}
                  >
                    {isSoldOut ? "Sold Out" : isSubmitting ? "Starting…" : "Book Seat"}
                  </Button>
                </div>
              </div>


              {c.slots.length > 1 && (
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() =>
                      setExpanded((s) => ({
                        ...s,
                        [c.class_session_id]: !isOpen,
                      }))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-info hover:underline"
                  >
                    <ChevronDown
                      className={`h-3 w-3 transition-transform ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    />
                    {isOpen ? "Hide full schedule" : "View full schedule"}
                  </button>
                  {isOpen && (
                    <ul className="mt-2 space-y-1 border-t border-border pt-2 text-sm text-foreground/90">
                      {c.slots.slice(1).map((s) => (
                        <li key={s.starts_at} className="text-sm">
                          {fmtSlot(s.starts_at, s.duration_minutes)}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>

  );
}

function HowBookingsWorkAccordion({ courseId }: { courseId: string }) {
  const fetchUpcoming = useServerFn(listPublicUpcomingCohorts);
  const { data: cohorts } = useQuery({
    queryKey: ["public-upcoming-cohorts", courseId],
    queryFn: () => fetchUpcoming({ data: { course_id: courseId } }),
    staleTime: 60_000,
  });
  const hasUpcoming = !!cohorts && cohorts.length > 0;

  return (
    <Accordion type="single" collapsible>
      <AccordionItem value="how-bookings-work" className="border-b-0">
        <AccordionTrigger className="py-0 text-base font-semibold text-info hover:no-underline [&>svg]:text-info">
          How Bookings Work
        </AccordionTrigger>

          <AccordionContent className="pb-5">
            <ul className="list-none space-y-3 text-[15px] leading-[1.6] text-foreground">
              {hasUpcoming && (
                <li className="flex gap-2">
                  <span aria-hidden="true">🎟️</span>
                  <span>
                    Choose the <strong>'Book Seat'</strong> option from the upcoming sessions list to instantly secure your spot.
                  </span>
                </li>
              )}
              {hasUpcoming ? (
                <li className="flex gap-2">
                  <span aria-hidden="true">💬</span>
                  <span>
                    Need a different time or a 1-on-1? Click <strong>'Message Guide'</strong> to coordinate a custom schedule.
                  </span>
                </li>
              ) : (
                <li className="flex gap-2">
                  <span aria-hidden="true">💬</span>
                  <span>
                    No sessions currently scheduled? Click <strong>'Message Guide'</strong> directly to request a 1-on-1 session or inquire about joining the next upcoming group cohort. Once you and the Guide agree on a time, they will send a personal booking link straight to your chat inbox.
                  </span>
                </li>
              )}
            </ul>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
  );

}


