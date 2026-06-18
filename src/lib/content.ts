// Single source of truth for informational page content.
// Edit text here and it propagates to /pages/:slug routes + footer automatically.
//
// Admin-readiness: each page record is keyed by slug. A future admin panel can
// replace any page's content by writing to INFO_PAGES[slug] (or a DB-backed
// equivalent) without changing route or component code. The runtime renderer
// places editable text inside <article id="dynamic-content" data-slug="...">.

export type StubCategory =
  | "Legal & Compliance"
  | "Trust & Operations"
  | "Angler Resources"
  | "Guide Resources"
  | "Company & Contact";

export type InfoBullet = { label: string; body: string };

export type InfoSection = {
  heading?: string;
  body: string;
  variant?: "lead" | "default";
  /** Optional emoji or short glyph rendered before the heading in brand accent. */
  icon?: string;
  /** Optional bulleted list rendered below the body. Supports **bold** in body. */
  bullets?: InfoBullet[];
};

export type InfoCta = { label: string; to: string };

export type InfoPage = {
  slug: string;
  title: string;
  /** Optional shorter label used in the footer (falls back to `title`). */
  footerLabel?: string;
  description: string;
  headline: string;
  category: StubCategory;
  lastUpdated?: string;
  sections: InfoSection[];
  cta?: InfoCta;
};

// Helper to build a single-section page from short stub copy.
const stub = (
  slug: string,
  title: string,
  description: string,
  headline: string,
  body: string,
  category: StubCategory,
): InfoPage => ({ slug, title, description, headline, category, sections: [{ body }] });

export const INFO_PAGES: Record<string, InfoPage> = {
  // Legal & Compliance
  "privacy-policy": {
    slug: "privacy-policy",
    title: "Privacy Policy",
    description: "How FishTrippers collects, uses, and protects your information.",
    headline: "Your privacy is our priority.",
    category: "Legal & Compliance",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "1. Simple Data Promise",
        body: "In this early version of FishTrippers, we only collect the information necessary to create your account and match you with an Guide. We do not sell your data to third parties.",
      },
      {
        heading: "2. Learning Data",
        body: "Any messages or preferences you share are used solely to help your Guide understand your goals. We use standard industry encryption to keep this information safe.",
      },
      {
        heading: "3. Your Rights",
        body: "You can request to delete your account and all associated data at any time by contacting our support team.",
      },
    ],
  },
  "terms-of-service": {
    slug: "terms-of-service",
    title: "Terms of Service",
    description: "The rules that govern your use of FishTrippers.",
    headline: "The rules of the road for FishTrippers.",
    category: "Legal & Compliance",
    lastUpdated: "May 2026",
    sections: [
      {
        heading: "1. Our Community Spirit",
        body: "FishTrippers is a place for respectful learning. We expect all Aides and learners to treat each other with patience and kindness.",
      },
      {
        heading: "2. The Guide-Angler Relationship",
        body: "Aides are independent guides helping you learn AI tools. They are not employees of FishTrippers. We provide the platform; they provide the wisdom.",
      },
      {
        heading: "3. Beta Platform Notice",
        body: "As we build the future of AI education, this platform is provided 'as-is.' We are working hard to make it perfect, but we appreciate your patience as we grow.",
      },
    ],
  },
  "mentor-agreement": stub(
    "mentor-agreement",
    "Guide Agreement",
    "Terms that apply to Aides offering Fishing Trips on FishTrippers.",
    "Our promise to Aides, and yours to learners.",
    "The full Guide Agreement is coming soon. In the meantime, Aides agree to offer guidance with patience, kindness, and honesty.",
    "Legal & Compliance",
  ),
  "acceptable-use-policy": stub(
    "acceptable-use-policy",
    "Acceptable Use Policy",
    "What you can and can't do on FishTrippers.",
    "Keeping FishTrippers safe and useful for everyone.",
    "The full Acceptable Use Policy is coming soon. Be respectful, stay on-topic, and don't misuse the platform.",
    "Legal & Compliance",
  ),

  // Trust & Operations
  "trust-and-safety": stub(
    "trust-and-safety",
    "Trust & Safety",
    "How we keep FishTrippers a safe place to learn and teach.",
    "Building a community you can trust.",
    "Detailed Trust & Safety guidelines are coming soon. If you ever feel unsafe, contact support immediately.",
    "Trust & Operations",
  ),
  "data-handling": stub(
    "data-handling",
    "Data Handling",
    "How FishTrippers stores, processes, and protects your data.",
    "Clear answers about your data.",
    "Our full data handling overview is coming soon. We collect only what's needed to deliver Aide-ship and never sell your data.",
    "Trust & Operations",
  ),
  security: stub(
    "security",
    "Platform Security",
    "The technical and organizational measures protecting FishTrippers.",
    "Security you don't have to think about.",
    "A detailed security overview is coming soon. We use industry-standard encryption in transit and at rest.",
    "Trust & Operations",
  ),

  // Angler Resources
  "how-it-works": {
    slug: "how-it-works",
    title: "How It Works: Your Path to AI Mastery",
    footerLabel: "How it Works",
    description:
      "How FishTrippers connects you with human Aides through structured Fishing Trips, live sessions, and Refuel add-ons.",
    headline:
      "Stop stumbling through complex tools. Master AI with a human Guide by your side.",
    category: "Angler Resources",
    sections: [
      {
        variant: "lead",
        body: "Stop stumbling through complex tools and expensive, impersonal tutorials. At FishTrippers, we believe the fastest way to master a new skill is through a direct, human connection. We've built a peer-to-peer marketplace where the world's leading AI experts—our **Aides**—guide you every step of the way.",
      },
      {
        icon: "🗺️",
        heading: "The Fishing Trip",
        body: "Forget generic video bundles. Our **Aides** design structured, one-on-one experiences called **Fishing Trips**. Whether you want to master AI Art, score a film with AI Music, or automate your professional writing, you simply find the **Fishing Trip** that matches your goals.",
      },
      {
        icon: "🤝",
        heading: "Connect & Create",
        body: "Once you book a **Fishing Trip**, the \"squeeze\" is over.",
        bullets: [
          {
            label: "Direct Access",
            body: "You work one-on-one with your **Guide** in live, online sessions.",
          },
          {
            label: "Tailored Timing",
            body: "Dates and times are organized directly with your **Guide** to fit your schedule.",
          },
          {
            label: "No More Guesswork",
            body: "You get instant feedback and real-time guidance, ensuring you spend your time creating, not troubleshooting.",
          },
        ],
      },
      {
        icon: "🌱",
        heading: "Supporting the Grove",
        body: "FishTrippers is proud to support this growing community of creators. To keep our site running and our community vibrant, we collect a small service fee on each booking. We kindly ask that you keep your bookings and communications within the platform—this ensures your sessions are protected and helps us continue to provide the \"juice\" that powers your growth.",
      },
      {
        icon: "⛽",
        heading: "The Refuel",
        body: "Mastery doesn't have an expiration date. After completing your initial **Course**, you have the option to keep the momentum going. You can book Add-on Sessions with your **Aide** for as long as you need to perfectly \"fine-tune\" your new skills.",
      },
    ],
    cta: { label: "Start Your Fishing Trip", to: "/search" },
  },
  "first-lesson-guide": stub(
    "first-lesson-guide",
    "First Trip Guide",
    "What to expect from your very first trip on FishTrippers.",
    "Your first trip, made easy.",
    "A friendly first-trip guide is coming soon. Show up curious — your Guide will take care of the rest.",
    "Angler Resources",
  ),
  "learner-faqs": stub(
    "learner-faqs",
    "Angler FAQs",
    "Answers to common questions from learners on FishTrippers.",
    "Got a question? Start here.",
    "Our full Angler FAQ is coming soon. In the meantime, contact support and we'll get right back to you.",
    "Angler Resources",
  ),

  // Aide Resources
  "become-a-mentor": {
    ...stub(
      "become-a-mentor",
      "Become an Guide",
      "Share your AI know-how, build a Fishing Trip, and start earning on FishTrippers.",
      "Turn what you know into income.",
      "Full Guide onboarding details are coming soon. Ready now? List your first Fishing Trip from the Guide dashboard.",
      "Guide Resources",
    ),
    footerLabel: "Become an Guide",
  },
  "mentor-faqs": {
    ...stub(
      "mentor-faqs",
      "Guide FAQs",
      "Answers to common questions from Aides on FishTrippers.",
      "Everything Aides ask, in one place.",
      "Our full Guide FAQ is coming soon. Reach out anytime — we love hearing from our Aides.",
      "Guide Resources",
    ),
    footerLabel: "Guide FAQs",
  },

  // Company & Contact
  "about-us": {
    slug: "about-us",
    title: "The FishTrippers Manifesto: AI Made Refreshing",
    footerLabel: "About FishTrippers",
    description:
      "All the juice, none of the seeds. Why FishTrippers exists and how our human Aides help creators master AI.",
    headline: "All the juice, none of the seeds.",
    category: "Company & Contact",
    sections: [
      {
        variant: "lead",
        body: "In an era of AI noise, FishTrippers is the filter. We believe that mastering the world's most powerful creative tools shouldn't be a bitter struggle—it should be a refreshing transformation. The current AI landscape is often 'sour': overwhelming, cluttered with technical 'seeds,' and prone to leaving creators feeling burnt out. We exist to provide the clarity, Guide-ship, and 'juice' you need to actually produce work that matters.",
      },
      {
        body: "Our marketplace connects you with human experts—your Guide—to help you navigate the cutting edge of AI Art, Music, Video, Writing, and Design. Every Guide offers Signature Guide Fishing Trips, which are specialized, structured paths designed to take you from curious to capable. These are the secret recipes for mastering specific AI workflows, ensuring you aren't just learning tools, but mastering the craft.",
      },
      {
        body: "While our trips provide the roadmap, our Aides provide the Personal Touch. They guide you through the noise, helping you apply advanced AI techniques to your unique creative voice. And if you ever need a little more momentum, our Refuel Sessions allow you to extend your journey whenever you need extra support, a deeper dive, or a creative tune-up.",
      },
      {
        body: "Whether you are a professional looking to Juice Up your workflow or a creator mastering a new medium, we provide the expertise you need to succeed. At FishTrippers, we give you all the juice and none of the seeds.",
      },
    ],
    cta: { label: "Find Your Guide", to: "/search" },
  },
  contact: stub(
    "contact",
    "Contact Support",
    "Get in touch with the FishTrippers team.",
    "We're here to help.",
    "A full contact form is coming soon. For now, email us at hello@FishTrippers and we'll respond within one business day.",
    "Company & Contact",
  ),
  news: stub(
    "news",
    "FishTrippers News",
    "Updates, announcements, and stories from the FishTrippers community.",
    "Fresh-squeezed updates from the Grove.",
    "Our newsroom is coming soon. Until then, follow us on Instagram, TikTok, LinkedIn, or YouTube for the latest.",
    "Company & Contact",
  ),
};

export type SocialIcon = "newspaper" | "instagram" | "tiktok" | "linkedin" | "youtube";

export type FooterLink =
  | { kind: "external"; to: string; label: string; icon?: SocialIcon; newTab?: boolean }
  | { kind: "info"; slug: string; label: string; icon?: SocialIcon };

export type FooterGroup = {
  category: string;
  links: FooterLink[];
};

// Hand-curated footer. All destinations are existing routes:
// - "external" → real app routes (handled by <a href>)
// - "info" → unified /pages/$slug template (uses INFO_PAGES content)
export const FOOTER_GROUPS: FooterGroup[] = [
  {
    category: "Learning & Teaching",
    links: [
      { kind: "external", to: "/", label: "Find a Fishing Trip" },
      { kind: "external", to: "/create-listing/new?new=true", label: "Become an Guide" },
      { kind: "info", slug: "how-it-works", label: "How it Works" },
      { kind: "info", slug: "learner-faqs", label: "Angler FAQs" },
      { kind: "info", slug: "mentor-faqs", label: "Guide FAQs" },
    ],
  },
  {
    category: "Support & Safety",
    links: [
      { kind: "info", slug: "about-us", label: "About FishTrippers" },
      { kind: "info", slug: "contact", label: "Contact Support" },
      { kind: "info", slug: "trust-and-safety", label: "Trust & Safety" },
      { kind: "info", slug: "data-handling", label: "Data & Security" },
    ],
  },
  {
    category: "Legal",
    links: [
      { kind: "info", slug: "privacy-policy", label: "Privacy Policy" },
      { kind: "info", slug: "terms-of-service", label: "Terms of Service" },
      { kind: "info", slug: "mentor-agreement", label: "Guide Agreement" },
      { kind: "info", slug: "acceptable-use-policy", label: "Acceptable Use Policy" },
    ],
  },
  {
    category: "Connect",
    links: [
      { kind: "info", slug: "news", label: "News", icon: "newspaper" },
      { kind: "external", to: "https://instagram.com/fishtrippers", label: "Instagram", icon: "instagram", newTab: true },
      { kind: "external", to: "https://tiktok.com/@fishtrippers", label: "TikTok", icon: "tiktok", newTab: true },
      { kind: "external", to: "https://linkedin.com/company/fishtrippers", label: "LinkedIn", icon: "linkedin", newTab: true },
      { kind: "external", to: "https://youtube.com/@fishtrippers", label: "YouTube", icon: "youtube", newTab: true },
    ],
  },
];

// Legacy compatibility: maps old flat path -> new slug. Used by redirect shims.
export const LEGACY_PATH_TO_SLUG: Record<string, string> = Object.fromEntries(
  Object.values(INFO_PAGES).map((p) => [`/${p.slug}`, p.slug]),
);
