import { useEffect, useRef, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Play,
  Search,
  CalendarCheck,
  Waves,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


import { useServerFn } from "@tanstack/react-start";
import { useAuthStore } from "@/stores/useAuthStore";
import { useQuery } from "@tanstack/react-query";
import { searchOperatorsServer } from "@/lib/operators-search.functions";
import { listFeaturedCategories } from "@/lib/categories.functions";
import { getCategoryPlaceholder } from "@/lib/category-placeholders";
import type { JourneyCategory } from "@/data/lesson-paths";
import { OperatorCard } from "@/components/listings/OperatorCard";
import { DESIGN_SYSTEM } from "@/lib/brand";
import heroFishingAsset from "@/assets/hero-fishing.jpg.asset.json";
const heroFishing = heroFishingAsset.url;
import { HeroBookingBar } from "@/components/layout/HeroBookingBar";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MissionMatchQuiz } from "@/components/onboarding/MissionMatchQuiz";


export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "FishTrippers™ — Learn AI Tools 1:1 with an Expert Guide" },
      {
        name: "description",
        content:
          "Get paired with an expert Guide for live, 1:1 trips on ChatGPT, Midjourney, and more. AI Made Refreshing™.",
      },
      { property: "og:title", content: "FishTrippers™ — Learn AI Tools 1:1 with an Expert Guide" },
      {
        property: "og:description",
        content:
          "Get paired with an expert Guide for live, 1:1 trips on ChatGPT, Midjourney, and more.",
      },
      { property: "og:url", content: "https://fishtrippers.com/" },
    ],
    links: [{ rel: "canonical", href: "https://fishtrippers.com/" }],
  }),
  component: Index,
});




const PROCESS_STEPS = [
  {
    icon: Search,
    title: "1. Find Your Perfect Trip",
    body: "Browse the best local charters, fishing guides, and walk-and-wade experts. Filter by your favorite environment, target fish, or preferred style of fishing.",
  },
  {
    icon: CalendarCheck,
    title: "2. Book Your Way",
    body: "Lock in your dates instantly with Instant Booking, or message a captain directly to build a fully customized, tailor-made fishing adventure.",
  },
  {
    icon: Waves,
    title: "3. Hit the Water",
    body: "Show up at the dock or the shoreline, meet your expert guide, and enjoy a hassle-free day of world-class fishing!",
  },
] as const;

function FishTrippersProcess() {
  return (
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-16">
        <div className="mx-auto mb-12 max-w-2xl text-center">
          <h2
            className="text-2xl tracking-tight md:text-3xl"
            style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', fontWeight: 800 }}
          >
            <span style={{ color: "#0A2540" }}>How </span>
            <span style={{ color: "#E8B547" }}>Fish</span>
            <span style={{ color: "#0A2540" }}>trippers Works</span>
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground md:text-base">
            Three simple steps from dream trip to tight lines.
          </p>
        </div>

        <ol className="grid grid-cols-1 gap-6 md:grid-cols-3 lg:gap-8">
          {PROCESS_STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <li
                key={s.title}
                className="group flex flex-col items-center rounded-2xl border border-border bg-card p-8 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
              >
                <span className="inline-flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-[#E8B547] to-[#0A2540] text-white shadow-md transition-transform duration-300 group-hover:scale-105">
                  <Icon className="size-6" aria-hidden />
                </span>
                <h3
                  className="mt-5 text-xl font-bold md:text-2xl"
                  style={{ fontFamily: "Lora, ui-serif, Georgia, serif", color: "#0A2540" }}
                >
                  {s.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}


function CategoryGrid() {
  const fetchFeatured = useServerFn(listFeaturedCategories);
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["featured-categories"],
    queryFn: () => fetchFeatured(),
  });

  const scrollerRef = useRef<HTMLUListElement | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateArrows = () => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    updateArrows();
    const el = scrollerRef.current;
    if (!el) return;
    const onScroll = () => updateArrows();
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", updateArrows);
    return () => {
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", updateArrows);
    };
  }, [categories.length, isLoading]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-12 md:py-16">
        <h2
          className="text-2xl text-foreground md:text-3xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Explore by Category
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a flavor and find the perfect Guide-led trip.
        </p>

        <div className="relative mt-8">
          {canScrollLeft && (
            <button
              type="button"
              aria-label="Scroll categories left"
              onClick={() => scrollBy(-1)}
              className="absolute left-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white p-2 shadow-md transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B547] md:flex"
            >
              <ChevronLeft className="size-5 text-foreground" />
            </button>
          )}
          {canScrollRight && (
            <button
              type="button"
              aria-label="Scroll categories right"
              onClick={() => scrollBy(1)}
              className="absolute right-2 top-1/2 z-10 hidden -translate-y-1/2 items-center justify-center rounded-full border border-border bg-white p-2 shadow-md transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B547] md:flex"
            >
              <ChevronRight className="size-5 text-foreground" />
            </button>
          )}

          <ul
            ref={scrollerRef}
            className="flex gap-4 overflow-x-auto scroll-smooth pb-2 snap-x snap-mandatory [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden"
          >
            {isLoading
              ? Array.from({ length: 6 }).map((_, i) => (
                  <li
                    key={i}
                    className="aspect-square w-[180px] shrink-0 animate-pulse snap-start rounded-2xl border border-border bg-muted/40 md:w-[200px]"
                  />
                ))
              : categories.map((c) => {
                  const img = c.image_url ?? getCategoryPlaceholder(c.name as JourneyCategory);
                  return (
                    <li key={c.id} className="w-[180px] shrink-0 snap-start md:w-[200px]">
                      <Link
                        to="/search"
                        search={{ category: c.name } as never}
                        className="group relative flex aspect-square w-full flex-col items-center justify-end overflow-hidden rounded-2xl border border-border bg-[#0A2540]/10 p-4 text-center shadow-sm transition-all duration-200 hover:scale-105 hover:border-[#E8B547] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B547]"
                      >
                        <img
                          src={img}
                          alt=""
                          className="absolute inset-0 size-full object-cover transition-transform duration-300 group-hover:scale-110"
                          loading="lazy"
                        />
                        <span className="absolute inset-0 bg-gradient-to-t from-[#1F2A24]/85 via-[#1F2A24]/30 to-transparent" />
                        <span
                          className="relative z-10 text-sm font-bold text-white md:text-base"
                          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
                        >
                          {c.name}
                        </span>
                      </Link>
                    </li>
                  );
                })}
          </ul>
        </div>
      </div>
    </section>
  );
}

function Index() {
  const _navigate = useNavigate();
  void _navigate;

  const [videoOpen, setVideoOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const authInitialized = useAuthStore((s) => s.initialized);
  const authUser = useAuthStore((s) => s.user);
  const greetingName =
    authUser?.displayName && authUser.displayName.trim().length > 0
      ? authUser.displayName
      : "Angler";
  const showGreeting = authInitialized && !!authUser;

  const fetchFeatured = useServerFn(searchOperatorsServer);
  const featuredQuery = useQuery({
    queryKey: ["featured-operators"],
    queryFn: () => fetchFeatured({ data: { featuredOnly: false, limit: 6 } }),
  });
  const featured = featuredQuery.data?.items ?? [];


  useEffect(() => {
    try {
      if (localStorage.getItem("fishtrippers_quiz_open") === "1") {
        localStorage.removeItem("fishtrippers_quiz_open");
        setQuizOpen(true);
      }
    } catch {
      // ignore (SSR / disabled storage)
    }
  }, []);




  return (
    <div className="min-h-screen bg-background">
      {/* HERO — FishTrippers */}
      <section className="relative overflow-hidden">
        <img
          src={heroFishing}
          alt="Anglers on a boat holding a large fish at sunset"
          width={1920}
          height={1080}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[50%_25%] md:object-top"
        />
        {/* Navy gradient overlay for legibility */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "linear-gradient(180deg, rgba(10,37,64,0.55) 0%, rgba(10,37,64,0.30) 40%, rgba(10,37,64,0.70) 100%)",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-[1600px] flex-col justify-center px-4 pb-10 pt-20 md:min-h-[760px] md:px-8 md:pb-16 md:pt-28">
          {showGreeting && (
            <p
              className="mb-3 text-lg text-white/90 md:text-xl"
              style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
            >
              Welcome back, {greetingName}
            </p>
          )}
          <h1
            className="max-w-3xl text-4xl font-extrabold text-white drop-shadow-md md:text-6xl"
            style={{ fontFamily: DESIGN_SYSTEM.fonts.serif, lineHeight: 1.05 }}
          >
            Book your next fishing trip
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-white/90 md:text-xl">
            Discover top-rated fishing charters and guides.
          </p>

          <div className="mt-8 md:mt-12">
            <HeroBookingBar />
          </div>

          <div className="mt-6 flex flex-wrap items-center justify-start gap-3">
            <button
              type="button"
              onClick={() => setVideoOpen(true)}
              className="inline-flex items-center gap-2 text-sm text-white/85 hover:text-white hover:underline"
            >
              <span className="inline-flex size-6 items-center justify-center rounded-full bg-white/20 text-white">
                <Play className="size-3 fill-current" />
              </span>
              How FishTrippers works
            </button>
          </div>

        </div>
      </section>


      {/* FEATURED COURSES */}
      {(featuredQuery.isLoading || featured.length > 0) && (
        <section className="border-b border-border">
          <div className="mx-auto max-w-[1600px] px-4 md:px-6 lg:px-8 py-16">
            <h2
              className="text-3xl text-foreground"
              style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
            >
              Featured Charters & Guides
            </h2>
            {featuredQuery.isLoading ? (
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-[16/10] animate-pulse rounded-2xl border border-border bg-muted/40"
                  />
                ))}
              </div>
            ) : (
              <ul className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {featured.map((op) => (
                  <OperatorCard key={op.id} operator={op} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* CATEGORY QUICK-LINKS */}
      <CategoryGrid />

      {/* THE FISHTRIPPERS PROCESS */}
      <FishTrippersProcess />


      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
          <div
            className="h-1 w-full"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, #E8B547 0%, #0A2540 100%)",
            }}
          />
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
            <DialogTitle
              style={{
                fontFamily: "Lora, ui-serif, Georgia, serif",
                color: "#0A2540",
              }}
            >
              How FishTrippers Works
            </DialogTitle>
            <DialogDescription className="sr-only">
              Intro video about FishTrippers.
            </DialogDescription>
          </DialogHeader>
          {videoOpen && (
            <div className="bg-black">
              <div
                style={{
                  position: "relative",
                  paddingTop: "56.25%",
                  width: "100%",
                  height: 0,
                  overflow: "hidden",
                }}
              >
                <iframe
                  src="https://iframe.mediadelivery.net/embed/683194/4a27c961-f4c0-4b88-b463-e507b24032fa?autoplay=true&loop=false&muted=true&color=FF5733"
                  title="How FishTrippers Works"
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    height: "100%",
                    border: "none",
                  }}
                  allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* MISSION MATCH QUIZ */}
      <MissionMatchQuiz open={quizOpen} onOpenChange={setQuizOpen} />
    </div>
  );
}
