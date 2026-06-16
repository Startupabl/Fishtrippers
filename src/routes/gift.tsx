import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Gift, Sparkles, UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GiftCheckoutDialog } from "@/components/gift/GiftCheckoutDialog";

export const Route = createFileRoute("/gift")({
  head: () => ({
    meta: [
      { title: "FishTrippers Gift Cards — FishTrippers" },
      {
        name: "description",
        content:
          "Give the gift of a guided fishing trip. FishTrippers Gift Cards from $60 to $500 — redeemable for any charter or guided trip.",
      },
      { property: "og:title", content: "FishTrippers Gift Cards" },
      {
        property: "og:description",
        content:
          "Gift cards from a half-day to a full charter. Unforgettable trips, hand-delivered.",
      },
    ],
  }),
  component: GiftPage,
});

interface Tier {
  name: string;
  subtitle: string;
  price: number;
  copy: string;
  vessel: "sip" | "glass" | "pitcher";
  badge?: string;
}

const TIERS: Tier[] = [
  {
    name: "The Tasting",
    subtitle: "Small Sip",
    price: 60,
    copy: "A single deep-dive session with an expert Aide. Perfect first taste.",
    vessel: "sip",
  },
  {
    name: "The Full Pour",
    subtitle: "Standard Course",
    price: 200,
    copy: "The complete experience — 4 sessions with a 1-on-1 Aide.",
    vessel: "glass",
    badge: "Best Value",
  },
  {
    name: "The Zest Master",
    subtitle: "Masterclass Pitcher",
    price: 500,
    copy: "The ultimate AI career boost — multiple missions and unlimited Aide support.",
    vessel: "pitcher",
  },
];

const LEAF_GREEN = "#3DA35D";
const SUNNY_YELLOW = "#F5C518";

function LemonadeVessel({
  vessel,
}: {
  vessel: "sip" | "glass" | "pitcher";
}) {
  // Fill heights tuned per vessel
  const fillY = vessel === "sip" ? 58 : vessel === "glass" ? 28 : 22;
  const fillH = 100 - fillY - 14; // bottom padding

  if (vessel === "pitcher") {
    return (
      <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
        {/* Pitcher body */}
        <defs>
          <linearGradient id="pitcherFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#FFE066" />
            <stop offset="1" stopColor={SUNNY_YELLOW} />
          </linearGradient>
        </defs>
        <path
          d="M28 28 H86 L92 38 V96 Q92 108 80 108 H34 Q22 108 22 96 V38 Z"
          fill="white"
          stroke="#222"
          strokeWidth="2.5"
        />
        {/* Handle */}
        <path
          d="M92 50 Q108 55 108 72 Q108 90 92 92"
          fill="none"
          stroke="#222"
          strokeWidth="2.5"
        />
        {/* Lemonade fill */}
        <clipPath id="pitcherClip">
          <path d="M28 32 H86 L88 40 V96 Q88 104 80 104 H34 Q26 104 26 96 V40 Z" />
        </clipPath>
        <g clipPath="url(#pitcherClip)">
          <rect x="22" y={fillY} width="74" height={fillH} fill="url(#pitcherFill)" />
          {/* lemon slice */}
          <circle cx="50" cy={fillY + 3} r="6" fill="#FFF6B0" stroke="#E0A800" strokeWidth="1" />
          <circle cx="68" cy={fillY + 6} r="4" fill="#FFF6B0" stroke="#E0A800" strokeWidth="1" />
        </g>
        {/* leaf */}
        <path d="M58 22 Q66 14 78 18 Q72 28 60 26 Z" fill={LEAF_GREEN} />
      </svg>
    );
  }

  // Glass / Sip
  const isSip = vessel === "sip";
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28" aria-hidden>
      <defs>
        <linearGradient id={`glassFill-${vessel}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFE066" />
          <stop offset="1" stopColor={SUNNY_YELLOW} />
        </linearGradient>
      </defs>
      {/* Glass shape: tapered tumbler */}
      <path
        d={isSip
          ? "M40 22 H80 L74 104 Q74 110 68 110 H52 Q46 110 46 104 Z"
          : "M36 18 H84 L78 106 Q78 112 72 112 H48 Q42 112 42 106 Z"}
        fill="white"
        stroke="#222"
        strokeWidth="2.5"
      />
      {/* fill */}
      <clipPath id={`glassClip-${vessel}`}>
        <path
          d={isSip
            ? "M41 24 H79 L73 103 Q73 108 68 108 H52 Q47 108 47 103 Z"
            : "M37 20 H83 L77 105 Q77 110 72 110 H48 Q43 110 43 105 Z"}
        />
      </clipPath>
      <g clipPath={`url(#glassClip-${vessel})`}>
        <rect x="30" y={fillY} width="64" height={fillH + 4} fill={`url(#glassFill-${vessel})`} />
        <circle cx="55" cy={fillY + 3} r="5" fill="#FFF6B0" stroke="#E0A800" strokeWidth="1" />
        {!isSip && (
          <circle cx="68" cy={fillY + 6} r="4" fill="#FFF6B0" stroke="#E0A800" strokeWidth="1" />
        )}
      </g>
      {/* straw */}
      <rect
        x={isSip ? "62" : "64"}
        y="10"
        width="4"
        height="28"
        rx="1"
        transform={`rotate(15 ${isSip ? 64 : 66} 24)`}
        fill={LEAF_GREEN}
      />
      {/* leaf garnish */}
      <path d={isSip ? "M48 22 Q54 14 64 18 Q58 26 48 24 Z" : "M44 18 Q52 10 64 14 Q56 24 44 22 Z"} fill={LEAF_GREEN} />
    </svg>
  );
}

function GiftPage() {
  const [openTier, setOpenTier] = useState<Tier | null>(null);

  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Decorative gradient backdrop */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 15% 10%, rgba(61,163,93,0.18) 0%, transparent 60%), radial-gradient(50% 40% at 85% 20%, rgba(245,197,24,0.20) 0%, transparent 60%), radial-gradient(70% 50% at 50% 100%, rgba(61,163,93,0.14) 0%, transparent 60%)",
        }}
      />

      <div className="mx-auto max-w-[1400px] px-4 md:px-8 py-16">
        <div className="flex items-center gap-3 text-info">
          <Gift className="size-6" />
          <span className="text-xs font-semibold uppercase tracking-wide">
            FishTrippers Gift Cards
          </span>
        </div>

        <h1
          className="mt-4 text-4xl text-foreground md:text-5xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          <span aria-hidden>🎁 </span>Give the Gift of a Perfect Squeeze.
        </h1>
        <p className="mt-3 max-w-2xl text-lg text-muted-foreground">
          Pick a course size for the curious friend, the career-switcher, or
          the creative who wants a real expert in their corner. Each gift is
          redeemable for any 1-on-1 guided AI Course on FishTrippers.
        </p>
        <p
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-info px-4 py-1.5 text-sm font-semibold text-white"
        >
          <Sparkles className="size-3.5" />
          Fresh skills, hand-delivered.
        </p>

        <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {TIERS.map((tier) => (
            <article
              key={tier.name}
              className={cn(
                "relative flex flex-col items-center rounded-3xl border border-white/50 bg-white/40 p-6 text-center shadow-lg backdrop-blur-md transition-transform",
                "hover:-translate-y-1 hover:shadow-xl",
              )}
              style={
                tier.badge
                  ? { boxShadow: "0 0 0 2px rgba(61,163,93,0.55), 0 10px 30px -10px rgba(61,163,93,0.35)" }
                  : undefined
              }
            >
              {tier.badge && (
                <span
                  className="absolute -top-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide text-white shadow"
                  style={{ backgroundColor: LEAF_GREEN }}
                >
                  <Sparkles className="size-3" />
                  {tier.badge}
                </span>
              )}

              <LemonadeVessel vessel={tier.vessel} />

              <h2
                className="mt-2 text-xl text-foreground"
                style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
              >
                {tier.name}
              </h2>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {tier.subtitle}
              </p>

              <p
                className="mt-3 text-4xl font-bold text-foreground"
                style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
              >
                ${tier.price}
              </p>

              <p className="mt-3 flex-1 text-sm text-muted-foreground">
                {tier.copy}
              </p>

              <span
                className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-info/30 bg-info/10 px-3 py-1 text-[11px] font-semibold text-info"
              >
                <UserRound className="size-3" />
                Includes 1-on-1 Aide Mentorship
              </span>

              <Button
                type="button"
                onClick={() => setOpenTier(tier)}
                variant="info"
                className="mt-5 w-full rounded-full"
              >
                Gift This · ${tier.price}
              </Button>
            </article>
          ))}
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link to="/">Back to home</Link>
          </Button>
          <Button asChild variant="ghost">
            <Link to="/search">Browse Courses</Link>
          </Button>
        </div>
      </div>

      <GiftCheckoutDialog
        open={!!openTier}
        onOpenChange={(o) => {
          if (!o) setOpenTier(null);
        }}
        tier={openTier ? { name: openTier.name, amount: openTier.price } : null}
      />
    </div>
  );
}
