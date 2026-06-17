import { useEffect, useRef, useState } from "react";

import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import {
  Sparkles,
  Play,
  LayoutGrid,
  Handshake,
  GlassWater,
  RefreshCw,
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
      { title: "FishTrippers™ — Learn AI Tools 1:1 with an Expert Aide" },
      {
        name: "description",
        content:
          "Get paired with an expert Aide for live, 1:1 Courses on ChatGPT, Midjourney, and more. AI Made Refreshing™.",
      },
      { property: "og:title", content: "FishTrippers™ — Learn AI Tools 1:1 with an Expert Aide" },
      {
        property: "og:description",
        content:
          "Get paired with an expert Aide for live, 1:1 Courses on ChatGPT, Midjourney, and more.",
      },
      { property: "og:url", content: "https://fishtrippers.com/" },
    ],
    links: [{ rel: "canonical", href: "https://fishtrippers.com/" }],
  }),
  component: Index,
});




const PROCESS_STEPS = [
  {
    icon: LayoutGrid,
    eyebrow: "Step 01",
    title: "Select Your Flavor",
    body: "Browse our catalog of AI-specialized courses. Pick the subject that sparks your curiosity, from creative strategy to technical execution.",
  },
  {
    icon: Handshake,
    eyebrow: "Step 02",
    title: "Stir in the Aide",
    body: "Learn 1-on-1 or in a group course with a dedicated Aide. They handle the complex tech while keeping your progress smooth and refreshing.",
  },
  {
    icon: GlassWater,
    eyebrow: "Step 03",
    title: "Pour the Results",
    body: "Graduate with a tangible project you've built. Share your high-quality results with your family, friends, or network.",
  },
  {
    icon: RefreshCw,
    eyebrow: "Step 04",
    title: "Refill Your Glass",
    body: "Keep the juice flowing. Unlock advanced courses and master new AI tools by enrolling in your next session.",
  },
] as const;

function FishTrippersProcess() {
  const [revealed, setRevealed] = useState(0);
  const refs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    if (reduceMotion) {
      setRevealed(PROCESS_STEPS.length);
      return;
    }
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const idx = Number((e.target as HTMLElement).dataset.idx);
            setRevealed((r) => Math.max(r, idx + 1));
          }
        });
      },
      { threshold: 0.5 },
    );
    refs.current.forEach((el) => el && obs.observe(el));
    return () => obs.disconnect();
  }, []);

  const fillPct = (revealed / PROCESS_STEPS.length) * 100;

  return (
    <section className="border-b border-border bg-card/40">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16">
        <h2
          className="mb-12 text-center text-2xl tracking-tight md:text-3xl"
          style={{ fontFamily: '"Plus Jakarta Sans", "Inter", system-ui, sans-serif', fontWeight: 800 }}
        >
          <span style={{ color: "#0A2540" }}>The </span>
          <span style={{ color: "#E8B547" }}>Fish</span>
          <span style={{ color: "#0A2540" }}>Trippers</span>
          <span style={{ color: "#0A2540" }}> Process</span>
        </h2>

        {/* Desktop: horizontal */}
        <ol className="relative hidden md:grid md:grid-cols-4 md:gap-6">
          <div
            className="absolute left-0 right-0 top-7 -z-0 h-1 rounded-full bg-border"
            aria-hidden
          />
          <div
            className="absolute left-0 top-7 -z-0 h-1 rounded-full bg-gradient-to-r from-[#E8B547] to-[#0A2540] transition-[width] duration-700 ease-out"
            style={{ width: `${fillPct}%` }}
            aria-hidden
          />
          {PROCESS_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i < revealed;
            return (
              <li
                key={s.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-idx={i}
                className="relative flex flex-col items-center text-center"
              >
                <span
                  className={
                    "relative z-10 inline-flex size-14 items-center justify-center rounded-full ring-4 ring-background transition-all duration-500 " +
                    (active
                      ? "bg-gradient-to-br from-[#E8B547] to-[#0A2540] text-white shadow-lg"
                      : "bg-muted text-muted-foreground grayscale")
                  }
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <span className="mt-4 text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  {s.eyebrow}
                </span>
                <h3
                  className="mt-2 min-h-[2lh] text-balance text-xl font-bold md:text-2xl"
                  style={{ fontFamily: "Lora, ui-serif, Georgia, serif", color: "#0A2540" }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {s.body}
                </p>
              </li>
            );
          })}
        </ol>

        {/* Mobile: vertical timeline */}
        <ol className="relative md:hidden">
          <div
            className="absolute bottom-0 left-7 top-0 -z-0 w-1 rounded-full bg-border"
            aria-hidden
          />
          <div
            className="absolute left-7 top-0 -z-0 w-1 rounded-full bg-gradient-to-b from-[#E8B547] to-[#0A2540] transition-[height] duration-700 ease-out"
            style={{ height: `${fillPct}%` }}
            aria-hidden
          />
          {PROCESS_STEPS.map((s, i) => {
            const Icon = s.icon;
            const active = i < revealed;
            return (
              <li
                key={s.title}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                data-idx={i}
                className="relative flex gap-5 pb-10 last:pb-0"
              >
                <span
                  className={
                    "relative z-10 inline-flex size-14 shrink-0 items-center justify-center rounded-full ring-4 ring-background transition-all duration-500 " +
                    (active
                      ? "bg-gradient-to-br from-[#E8B547] to-[#0A2540] text-white shadow-lg"
                      : "bg-muted text-muted-foreground grayscale")
                  }
                >
                  <Icon className="size-6" aria-hidden />
                </span>
                <div className="flex-1 pt-1">
                  <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                    {s.eyebrow}
                  </span>
                  <h3
                    className="mt-1 text-2xl font-bold"
                    style={{ fontFamily: "Lora, ui-serif, Georgia, serif", color: "#0A2540" }}
                  >
                    {s.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {s.body}
                  </p>
                </div>
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

  if (!isLoading && categories.length === 0) return null;

  return (
    <section className="border-b border-border bg-background">
      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-12 md:py-16">
        <h2
          className="text-2xl text-foreground md:text-3xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          Explore by Category
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Pick a flavor and find the perfect Aide-led course.
        </p>
        <ul className="mt-8 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
          {isLoading
            ? Array.from({ length: 6 }).map((_, i) => (
                <li
                  key={i}
                  className="aspect-square animate-pulse rounded-2xl border border-border bg-muted/40"
                />
              ))
            : categories.map((c) => {
                const img = c.image_url ?? getCategoryPlaceholder(c.name as JourneyCategory);
                return (
                  <li key={c.id}>
                    <Link
                      to="/search"
                      search={{ category: c.name } as never}
                      className="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl border border-border bg-[#0A2540]/10 p-4 text-center shadow-sm transition-all duration-200 hover:scale-105 hover:border-[#E8B547] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E8B547]"
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
          className="absolute inset-0 h-full w-full object-cover object-top"
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

        <div className="relative z-10 mx-auto flex max-w-[1400px] flex-col justify-center px-4 pb-10 pt-20 md:min-h-[760px] md:px-8 md:pb-16 md:pt-28">
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

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setQuizOpen(true)}
              className="inline-flex items-center gap-1 rounded-full bg-white/15 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur hover:bg-white/25"
            >
              <Sparkles className="size-3" />
              Find your perfect guide
            </button>
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
          <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16">
            <h2
              className="text-3xl text-foreground"
              style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
            >
              Featured Charters
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
              What is FishTrippers?
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
                  src="https://iframe.mediadelivery.net/embed/683194/aa5f7090-2922-4ba8-a2c8-0d11de0d09f2?autoplay=true&loop=false&muted=true&color=FF5733"
                  title="What is FishTrippers?"
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
