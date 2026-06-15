import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BRAND, DESIGN_SYSTEM } from "@/lib/brand";

export type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface LogoProps {
  size?: LogoSize;
  /** Force render mode. Defaults to "link" but auto-locks when onboarding is incomplete. */
  as?: "link" | "static";
  /** Render the brand tagline beneath the wordmark. */
  showTagline?: boolean;
  /** Center the wordmark/tagline lockup (e.g. for auth pages). */
  align?: "start" | "center";
  className?: string;
}

const SIZE_CLASSES: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
  "2xl": "text-5xl md:text-6xl",
};

const TAGLINE_CLASSES: Record<LogoSize, string> = {
  sm: "text-[10px]",
  md: "text-xs",
  lg: "text-sm",
  xl: "text-sm",
  "2xl": "text-base",
};

function Lockup({
  size,
  showTagline,
  align,
}: {
  size: LogoSize;
  showTagline?: boolean;
  align: "start" | "center";
}) {
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
        }}
      >
        <span style={{ color: DESIGN_SYSTEM.colors.sunnyYellow }}>
          {BRAND.nameParts.leading}
        </span>
        <span style={{ color: DESIGN_SYSTEM.colors.leafGreen }}>
          {BRAND.nameParts.middle}
        </span>
        <span style={{ color: DESIGN_SYSTEM.colors.sunnyYellow }}>
          {BRAND.nameParts.trailing}
        </span>
        <span
          aria-hidden="true"
          className="ml-0.5 align-super text-[0.5em] font-semibold"
          style={{ color: DESIGN_SYSTEM.colors.leafGreen }}
        >
          ™
        </span>
      </span>
      {showTagline && (
        <span
          className={cn(
            "mt-1 font-normal text-muted-foreground",
            TAGLINE_CLASSES[size],
          )}
          style={{ fontFamily: DESIGN_SYSTEM.fonts.sansSerif }}
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
  align = "start",
  className,
}: LogoProps) {
  const locked = as === "static";

  if (locked) {
    return (
      <span
        aria-disabled="true"
        aria-label={BRAND.name}
        className={cn("inline-flex cursor-default select-none", className)}
      >
        <Lockup size={size} showTagline={showTagline} align={align} />
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
      <Lockup size={size} showTagline={showTagline} align={align} />
    </Link>
  );
}

export default Logo;
