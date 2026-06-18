// Static V1 fixture for mentor profiles + lesson paths.
// Lives outside any store so SSR loaders can read it isomorphically.

export type LearnerGoal = "work" | "creative" | "life" | "curiosity";
export type LearnerDevice = "computer" | "tablet" | "smartphone";
export type LearnerPace = "slow" | "fast" | "playful";

export interface MentorFixture {
  slug: string;
  name: string;
  avatarUrl: string;
  bio: string;
  tagline: string;
  goals: LearnerGoal[];
  devices: LearnerDevice[];
  pace: LearnerPace[];
}

export type JourneyCategory =
  | "AI Music"
  | "AI Art"
  | "AI for Work"
  | "AI for Life"
  | "Design"
  | "AI Basics";

export const JOURNEY_CATEGORIES: JourneyCategory[] = [
  "AI Music",
  "AI Art",
  "AI for Work",
  "AI for Life",
  "Design",
  "AI Basics",
];

export interface PathFixture {
  id: string;
  slug: string;
  mentorSlug: string;
  title: string;
  description: string;
  priceMinor: number;
  currency: string;
  coverImage: string;
  /** Subject-matter image (NOT a portrait). Used for the in-product hero/card. */
  thumbnailImage?: string;
  syllabus: string[];
  totalLessons?: number;
  totalMentorSessions?: number;
  durationHours?: number;
  durationWeeks?: number;
  category: JourneyCategory;
  subcategory?: string;
  /** Free-form tags used by the multi-factor search. Lowercase, short. */
  tags?: string[];
  experienceLevel?: "Beginner" | "Intermediate" | "Advanced";
}

// Paper-Cream + Charcoal placeholder used when a Course has no thumbnailImage.
// Inline SVG keeps it in-bundle (no extra HTTP request, no asset file).
export const JOURNEY_THUMBNAIL_FALLBACK =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 1200 675' preserveAspectRatio='xMidYMid slice'>
      <rect width='1200' height='675' fill='#FDF8F3'/>
      <g fill='none' stroke='#333333' stroke-opacity='0.18' stroke-width='2'>
        <path d='M0 480 C 200 420, 400 540, 600 480 S 1000 420, 1200 480'/>
        <path d='M0 520 C 200 460, 400 580, 600 520 S 1000 460, 1200 520'/>
        <path d='M0 560 C 200 500, 400 620, 600 560 S 1000 500, 1200 560'/>
      </g>
      <g font-family='Inter, system-ui, sans-serif' fill='#333333' fill-opacity='0.55'>
        <text x='60' y='110' font-size='28' font-weight='600' letter-spacing='4'>AIGUIDING.IO</text>
        <text x='60' y='150' font-size='18' font-weight='400'>Live, Guide-Guided AI</text>
      </g>
    </svg>`,
  );

export function getJourneyThumbnail(p: PathFixture): string {
  return p.thumbnailImage ?? JOURNEY_THUMBNAIL_FALLBACK;
}

const DEFAULT_LESSONS = 4;
const DEFAULT_SESSIONS = 1;
const DEFAULT_HOURS = 5;
const DEFAULT_WEEKS = 2;

export function formatJourneyContents(p: PathFixture): string {
  const lessons = p.totalLessons ?? DEFAULT_LESSONS;
  const sessions = p.totalMentorSessions ?? DEFAULT_SESSIONS;
  const lessonWord = lessons === 1 ? "Trip" : "Trips";
  const sessionWord = sessions === 1 ? "Guiding Session" : "Guiding Sessions";
  return `Includes ${lessons} ${lessonWord} + ${sessions} ${sessionWord}`;
}

export function formatJourneyDuration(p: PathFixture): string {
  const hours = p.durationHours ?? DEFAULT_HOURS;
  const weeks = p.durationWeeks ?? DEFAULT_WEEKS;
  const hourWord = hours === 1 ? "hour" : "hours";
  const weekWord = weeks === 1 ? "week" : "weeks";
  return `Total time: ${hours} ${hourWord} over ${weeks} ${weekWord}`;
}

export const MENTORS: MentorFixture[] = [
  {
    slug: "martha-chen",
    name: "Martha Chen",
    avatarUrl:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop&q=80",
    bio: "Former Google PM, 8 years coaching first-time founders through their MVP.",
    tagline: "Productivity coach for busy professionals.",
    goals: ["work", "curiosity"],
    devices: ["computer"],
    pace: ["fast", "slow"],
  },
  {
    slug: "diego-romero",
    name: "Diego Romero",
    avatarUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=80",
    bio: "Senior ML engineer. Helps career-switchers land their first AI role.",
    tagline: "Career guide for aspiring AI pros.",
    goals: ["work"],
    devices: ["computer"],
    pace: ["fast"],
  },
  {
    slug: "amara-okafor",
    name: "Amara Okafor",
    avatarUrl:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=80",
    bio: "Brand designer with a decade of agency work. Loves logo systems.",
    tagline: "Creative guide for brand and visual play.",
    goals: ["creative"],
    devices: ["computer", "tablet"],
    pace: ["playful", "slow"],
  },
  {
    slug: "ada-patel",
    name: "Ada Patel",
    avatarUrl:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&auto=format&fit=crop&q=80",
    bio: "Illustrator and iPad-first AI artist. Patient with first-time creators.",
    tagline: "Expert in iPad AI for art and storytelling.",
    goals: ["creative", "curiosity"],
    devices: ["tablet"],
    pace: ["slow", "playful"],
  },
  {
    slug: "tomas-lee",
    name: "Tomás Lee",
    avatarUrl:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop&q=80",
    bio: "Life-admin coach. Helps people tame email, travel plans, and weekly logistics with AI.",
    tagline: "Calm guide for everyday life on your phone.",
    goals: ["life"],
    devices: ["smartphone", "tablet"],
    pace: ["slow"],
  },
  {
    slug: "priya-shah",
    name: "Priya Shah",
    avatarUrl:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=400&auto=format&fit=crop&q=80",
    bio: "Curious tinkerer. Walks beginners through the AI landscape with playful experiments.",
    tagline: "Friendly intro to what AI can really do.",
    goals: ["curiosity", "life"],
    devices: ["computer", "smartphone"],
    pace: ["playful", "slow"],
  },
];

export const PATHS: PathFixture[] = [
  {
    id: "p_mvp_30",
    slug: "ship-your-mvp-in-30-days",
    mentorSlug: "martha-chen",
    title: "Ship Your MVP in 30 Days",
    description:
      "A focused four-week sprint from idea to launched product, with weekly 1:1 reviews and a public demo day at the end.",
    priceMinor: 49900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1556761175-5973dc0f32e7?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Week 1 — Validate the problem",
      "Week 2 — Design the smallest slice",
      "Week 3 — Build & test with 5 users",
      "Week 4 — Launch & post-mortem",
    ],
    totalLessons: 4,
    totalMentorSessions: 4,
    durationHours: 16,
    durationWeeks: 4,
    category: "AI for Work",
    subcategory: "Product",
    tags: ["mvp", "startup", "product", "launch", "founder", "sprint", "demo"],
  },
  {
    id: "p_ai_career",
    slug: "land-your-first-ai-role",
    mentorSlug: "diego-romero",
    title: "Land Your First AI Role",
    description:
      "Six weeks of project-based prep covering the interview loop, take-home strategy, and a portfolio piece you can actually ship.",
    priceMinor: 39900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Foundations review",
      "Build a portfolio project",
      "System design for ML",
      "Mock interviews",
    ],
    totalLessons: 4,
    totalMentorSessions: 2,
    durationHours: 12,
    durationWeeks: 6,
    category: "AI for Work",
    subcategory: "Career",
    tags: ["career", "interview", "portfolio", "machine learning", "ml", "job", "hiring"],
  },
  {
    id: "p_logo_lab",
    slug: "logo-lab",
    mentorSlug: "amara-okafor",
    title: "Logo Lab",
    description:
      "Three weeks turning a brand brief into a full logo system — marks, lockups, and a usage guide you can hand to clients.",
    priceMinor: 29900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Brief & moodboard",
      "Sketching & exploration",
      "Vector refinement",
      "Brand guide delivery",
    ],
    totalLessons: 4,
    totalMentorSessions: 1,
    durationHours: 8,
    durationWeeks: 3,
    category: "Design",
    subcategory: "Logo",
    tags: ["logo", "branding", "brand", "identity", "vector", "design", "typography"],
  },
  {
    id: "p_ipad_art",
    slug: "ipad-ai-art-starter",
    mentorSlug: "ada-patel",
    title: "iPad AI Art Starter",
    description:
      "Four playful sessions making your first AI illustrations entirely on iPad — no laptop required.",
    priceMinor: 19900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1623126908029-58cb08a2b272?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Apps & setup",
      "Prompting for style",
      "Editing on iPad",
      "Sharing your gallery",
    ],
    totalLessons: 4,
    totalMentorSessions: 1,
    durationHours: 5,
    durationWeeks: 2,
    category: "AI Art",
    subcategory: "iPad",
    tags: ["ipad", "illustration", "art", "avatar", "drawing", "prompting", "image"],
  },
  {
    id: "p_inbox_zero",
    slug: "ai-for-inbox-zero",
    mentorSlug: "tomas-lee",
    title: "AI for Inbox Zero",
    description:
      "Three calm sessions to set up AI helpers for email, travel, and your weekly plan — right from your phone.",
    priceMinor: 14900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1611174743420-3d7df880ce32?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Pick your assistant",
      "Email triage",
      "Travel & calendar",
      "Weekly review",
    ],
    totalLessons: 4,
    totalMentorSessions: 1,
    durationHours: 4,
    durationWeeks: 2,
    category: "AI for Life",
    subcategory: "Email",
    tags: ["email", "inbox", "productivity", "calendar", "travel", "assistant", "phone"],
  },
  {
    id: "p_ai_tour",
    slug: "the-friendly-ai-tour",
    mentorSlug: "priya-shah",
    title: "The Friendly AI Tour",
    description:
      "Two relaxed sessions walking you through what today's AI tools actually do — with playful experiments along the way.",
    priceMinor: 9900,
    currency: "USD",
    coverImage:
      "https://images.unsplash.com/photo-1487412720507-e7ab37603c6f?w=1200&auto=format&fit=crop&q=80",
    thumbnailImage:
      "https://images.unsplash.com/photo-1620712943543-bcc4688e7485?w=1200&auto=format&fit=crop&q=80",
    syllabus: [
      "Tour of the landscape",
      "Try a chatbot together",
      "Make something silly",
      "Pick your next step",
    ],
    totalLessons: 4,
    totalMentorSessions: 1,
    durationHours: 3,
    durationWeeks: 2,
    category: "AI Basics",
    subcategory: "Overview",
    tags: ["beginner", "basics", "intro", "chatbot", "overview", "tour", "python"],
  },
];

export function getMentorBySlug(slug: string): MentorFixture | undefined {
  return MENTORS.find((m) => m.slug === slug);
}

export function getPathBySlug(slug: string): PathFixture | undefined {
  return PATHS.find((p) => p.slug === slug);
}

export function getPathsByMentor(slug: string): PathFixture[] {
  return PATHS.filter((p) => p.mentorSlug === slug);
}

export interface JourneyFilter {
  q?: string;
  category?: string;
  subcategory?: string;
}

export function searchPaths(filter: JourneyFilter): PathFixture[] {
  const q = filter.q?.trim().toLowerCase();
  return PATHS.filter((p) => {
    if (filter.category && p.category !== filter.category) return false;
    if (filter.subcategory && p.subcategory !== filter.subcategory) return false;
    if (q) {
      const hay = `${p.title} ${p.description}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

export function getSubcategoriesForCategory(category: string): string[] {
  const subs = PATHS.filter((p) => p.category === category)
    .map((p) => p.subcategory)
    .filter((s): s is string => !!s);
  return Array.from(new Set(subs));
}
