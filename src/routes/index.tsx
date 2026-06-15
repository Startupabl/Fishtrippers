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
import { listFeaturedJourneys } from "@/lib/journeys.functions";
import { listFeaturedCategories } from "@/lib/categories.functions";
import { getCategoryPlaceholder } from "@/lib/category-placeholders";
import type { JourneyCategory } from "@/data/lesson-paths";
import { LiveJourneyCard } from "@/components/listings/LiveJourneyCard";
import { DESIGN_SYSTEM } from "@/lib/brand";
import heroAide from "@/assets/hero-aide.jpg";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { MissionMatchQuiz } from "@/components/onboarding/MissionMatchQuiz";
import { TagSuggestInput } from "@/components/search/TagSuggestInput";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Lemonaidely™ — Learn AI Tools 1:1 with an Expert Aide" },
      {
        name: "description",
        content:
          "Get paired with an expert Aide for live, 1:1 Courses on ChatGPT, Midjourney, and more. AI Made Refreshing™.",
      },
      { property: "og:title", content: "Lemonaidely™ — Learn AI Tools 1:1 with an Expert Aide" },
      {
        property: "og:description",
        content:
          "Get paired with an expert Aide for live, 1:1 Courses on ChatGPT, Midjourney, and more.",
      },
      { property: "og:url", content: "https://lemonaidely.com/" },
    ],
    links: [{ rel: "canonical", href: "https://lemonaidely.com/" }],
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

function LemonaidelyProcess() {
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
          <span style={{ color: "#3DA35D" }}>The </span>
          <span style={{ color: "#F5C518" }}>Lemon</span>
          <span style={{ color: "#3DA35D" }}>AI</span>
          <span style={{ color: "#F5C518" }}>
            dely
            <span aria-hidden="true" className="ml-0.5 align-super text-[0.5em] font-semibold" style={{ color: "#3DA35D" }}>™</span>
          </span>
          <span style={{ color: "#3DA35D" }}> Process</span>
        </h2>

        {/* Desktop: horizontal */}
        <ol className="relative hidden md:grid md:grid-cols-4 md:gap-6">
          <div
            className="absolute left-0 right-0 top-7 -z-0 h-1 rounded-full bg-border"
            aria-hidden
          />
          <div
            className="absolute left-0 top-7 -z-0 h-1 rounded-full bg-gradient-to-r from-[#F5C518] to-[#3DA35D] transition-[width] duration-700 ease-out"
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
                      ? "bg-gradient-to-br from-[#F5C518] to-[#3DA35D] text-white shadow-lg"
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
                  style={{ fontFamily: "Lora, ui-serif, Georgia, serif", color: "#3DA35D" }}
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
            className="absolute left-7 top-0 -z-0 w-1 rounded-full bg-gradient-to-b from-[#F5C518] to-[#3DA35D] transition-[height] duration-700 ease-out"
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
                      ? "bg-gradient-to-br from-[#F5C518] to-[#3DA35D] text-white shadow-lg"
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
                    style={{ fontFamily: "Lora, ui-serif, Georgia, serif", color: "#3DA35D" }}
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
                      className="group relative flex aspect-square flex-col items-center justify-end overflow-hidden rounded-2xl border border-border bg-[#3DA35D]/10 p-4 text-center shadow-sm transition-all duration-200 hover:scale-105 hover:border-[#F5C518] hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#F5C518]"
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
  const navigate = useNavigate();

  const [videoOpen, setVideoOpen] = useState(false);
  const [quizOpen, setQuizOpen] = useState(false);
  const [heroQuery, setHeroQuery] = useState("");
  const [isDesktop, setIsDesktop] = useState(false);
  const authInitialized = useAuthStore((s) => s.initialized);
  const authUser = useAuthStore((s) => s.user);
  const greetingName =
    authUser?.displayName && authUser.displayName.trim().length > 0
      ? authUser.displayName
      : "Future Alchemist";
  const showGreeting = authInitialized && !!authUser;

  const fetchFeatured = useServerFn(listFeaturedJourneys);
  const featuredQuery = useQuery({
    queryKey: ["featured-journeys"],
    queryFn: () => fetchFeatured(),
  });
  const featured = featuredQuery.data ?? [];

  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const update = () => setIsDesktop(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  const handleHeroSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = heroQuery.trim();
    setHeroQuery("");
    navigate({ to: "/search", search: q ? { q } : undefined } as never);
  };

  useEffect(() => {
    try {
      if (localStorage.getItem("lemonaidely_quiz_open") === "1") {
        localStorage.removeItem("lemonaidely_quiz_open");
        setQuizOpen(true);
      }
    } catch {
      // ignore (SSR / disabled storage)
    }
  }, []);




  return (
    <div className="min-h-screen bg-background">
      {/* HERO — Fiverr-style search */}
      <section
        className="relative overflow-hidden border-b border-border"
        style={{
          backgroundImage:
            "radial-gradient(circle at 1px 1px, rgba(120,90,60,0.05) 1px, transparent 0), linear-gradient(160deg, #F2E6D2 0%, #FBF4E8 55%, #FFFBF3 100%)",
          backgroundSize: "18px 18px, auto",
        }}
      >
        {/* Background photo — desktop/tablet (wide) */}
        <img
          src={heroAide}
          alt="A LemonAIdely Aide ready to guide your AI course"
          width={1536}
          height={1024}
          loading="eager"
          fetchPriority="high"
          className="absolute inset-0 hidden h-full w-full object-cover md:block md:object-[72%_center] lg:object-right"
        />
        {/* Cream gradient overlay — desktop/tablet: horizontal (clears left for text) */}
        <div
          className="pointer-events-none absolute inset-0 hidden md:block"
          aria-hidden
          style={{
            background:
              "linear-gradient(95deg, #FBF4E8 0%, #FBF4E8 30%, rgba(251,244,232,0.9) 45%, rgba(251,244,232,0.4) 62%, rgba(251,244,232,0) 78%)",
          }}
        />
        <div className="relative z-10 mx-auto max-w-[1400px] px-4 text-center md:px-8 md:min-h-[560px] md:pt-24 md:pb-24 pt-16 pb-12">
          <div className="mx-auto max-w-xl md:mx-0 md:max-w-[58%] md:text-left">
            <p
              aria-hidden={!showGreeting}
              className="mb-4 text-2xl md:text-4xl"
              style={{
                fontFamily: "Lora, ui-serif, Georgia, serif",
                color: "#3DA35D",
                visibility: showGreeting ? "visible" : "hidden",
              }}
            >
              {showGreeting ? `Welcome back, ${greetingName}` : "\u00A0"}
            </p>
            <h1
              className="text-3xl text-foreground md:text-5xl"
              style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
            >
              Fresh AI skills. Hand-delivered.
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Whether you're mastering basic prompts or building complex AI-driven data pipelines, learn at your level. Choose from personalized 1-on-1 sessions or dynamic group courses to launch your next big project.
            </p>


            {/* Watch link */}
            <div className="mt-4">
              <button
                type="button"
                onClick={() => setVideoOpen(true)}
                className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground hover:underline"
              >
                <span className="inline-flex size-6 items-center justify-center rounded-full bg-info/10 text-info">
                  <Play className="size-3 fill-current" />
                </span>
                What is Lemonaidely?
              </button>
            </div>

            <form onSubmit={handleHeroSubmit} className="relative mt-6 max-w-xl">
              <TagSuggestInput
                value={heroQuery}
                onChange={setHeroQuery}
                onSubmit={(v) => {
                  setHeroQuery("");
                  const q = v.trim();
                  navigate({ to: "/search", search: q ? { q } : undefined } as never);
                }}
                placeholder={isDesktop ? "What AI tools would you like to learn today?" : "Search AI courses..."}
                ariaLabel="Search AI courses"
                inputClassName="h-14 w-full rounded-full border border-border bg-white pl-6 pr-28 sm:pr-36 text-base text-foreground shadow-md placeholder:text-muted-foreground focus:border-info focus:outline-none focus:ring-2 focus:ring-info/30"
                inputStyle={{ fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif" }}
                rightSlot={
                  <button
                    type="submit"
                    aria-label="Search"
                    className="absolute right-1.5 top-1/2 inline-flex h-11 -translate-y-1/2 items-center justify-center rounded-full px-4 sm:px-6 text-base font-semibold text-white shadow-sm transition-opacity hover:opacity-90"
                    style={{
                      backgroundColor: DESIGN_SYSTEM.colors.accentGreen,
                      fontFamily: "Inter, ui-sans-serif, system-ui, sans-serif",
                    }}
                  >
                    Squeeze
                  </button>
                }
              />
            </form>

            <div className="mt-4">
              <button
                type="button"
                onClick={() => setQuizOpen(true)}
                className="inline-flex items-center gap-1 rounded-full bg-info/10 px-3 py-1 text-xs font-semibold text-info hover:bg-info/15"
              >
                <Sparkles className="size-3" />
                Meet Your Perfect AIde
              </button>
            </div>
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
              Featured Courses
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
                {featured.map((j) => (
                  <LiveJourneyCard key={j.id} journey={j} />
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {/* CATEGORY QUICK-LINKS */}
      <CategoryGrid />

      {/* THE LEMONAIDELY PROCESS */}
      <LemonaidelyProcess />


      <Dialog open={videoOpen} onOpenChange={setVideoOpen}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden rounded-2xl">
          <div
            className="h-1 w-full"
            aria-hidden
            style={{
              background:
                "linear-gradient(90deg, #F5C518 0%, #3DA35D 100%)",
            }}
          />
          <DialogHeader className="px-5 pt-4 pb-3 border-b border-border">
            <DialogTitle
              style={{
                fontFamily: "Lora, ui-serif, Georgia, serif",
                color: "#3DA35D",
              }}
            >
              What is Lemonaidely?
            </DialogTitle>
            <DialogDescription className="sr-only">
              Intro video about Lemonaidely.
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
                  title="What is Lemonaidely?"
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
