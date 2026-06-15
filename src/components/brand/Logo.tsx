import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BRAND, DESIGN_SYSTEM } from "@/lib/brand";

export type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface LogoProps {
  size?: LogoSize;
  as?: "link" | "static";
  showTagline?: boolean;
  /** Kept for compatibility; the wordmark renders the same in all cases. */
  showMark?: boolean;
  align?: "start" | "center";
  tone?: "default" | "light";
  className?: string;
}

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
  xl: "text-3xl",
  "2xl": "text-4xl md:text-5xl",
};

const TAGLINE_CLASSES: Record<LogoSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-xs",
  xl: "text-sm",
  "2xl": "text-sm",
};

function Lockup({
  size,
  showTagline,
  align,
  tone,
}: {
  size: LogoSize;
  showTagline?: boolean;
  align: "start" | "center";
  tone: "default" | "light";
}) {
  const gold = DESIGN_SYSTEM.colors.gold;
  const taglineColor = tone === "light" ? "rgba(255,255,255,0.8)" : undefined;
  return (
    <span
      className={cn(
        "inline-flex flex-col leading-none",
        align === "center" ? "items-center text-center" : "items-start text-left",
      )}
    >
      <span
        className={cn("tracking-tight", SIZE_CLASSES[size])}
        style={{
          fontFamily: DESIGN_SYSTEM.fonts.sansSerif,
          fontWeight: 800,
          color: gold,
        }}
      >
        {BRAND.nameParts.leading}
        {BRAND.nameParts.trailing}
      </span>
      {showTagline && (
        <span
          className={cn("mt-1 font-normal", TAGLINE_CLASSES[size])}
          style={{
            fontFamily: DESIGN_SYSTEM.fonts.sansSerif,
            color: taglineColor ?? "var(--muted-foreground)",
          }}
        >
          {BRAND.tagline}
        </span>
      )}
    </span>
  );
}

export function Logo({
  size = "md",
  as,
  showTagline = false,
  showMark: _showMark = true,
  align = "start",
  tone = "default",
  className,
}: LogoProps) {
  void _showMark;
  const locked = as === "static";

  if (locked) {
    return (
      <span
        aria-disabled="true"
        aria-label={BRAND.name}
        className={cn("inline-flex cursor-default select-none", className)}
      >
        <Lockup size={size} showTagline={showTagline} align={align} tone={tone} />
      </span>
    );
  }

  return (
    <Link
      to={BRAND.homeRoute}
      aria-label={BRAND.name}
      className={cn(
        "inline-flex rounded-2xl outline-none transition-opacity hover:opacity-80 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      <Lockup size={size} showTagline={showTagline} align={align} tone={tone} />
    </Link>
  );
}

export default Logo;
