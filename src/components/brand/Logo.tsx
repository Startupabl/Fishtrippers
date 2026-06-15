import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { BRAND, DESIGN_SYSTEM } from "@/lib/brand";
import logoAsset from "@/assets/fishtrippers-logo.png.asset.json";
const logoMark = logoAsset.url;

export type LogoSize = "sm" | "md" | "lg" | "xl" | "2xl";

interface LogoProps {
  size?: LogoSize;
  /** Force render mode. Defaults to "link". */
  as?: "link" | "static";
  /** Render the brand tagline beneath the wordmark. */
  showTagline?: boolean;
  /** Show the circular fish mark next to the wordmark (default true). */
  showMark?: boolean;
  /** Center the wordmark/tagline lockup. */
  align?: "start" | "center";
  /** Force wordmark color (e.g. white over hero). */
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

const MARK_SIZE: Record<LogoSize, string> = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
  xl: "h-16",
  "2xl": "h-20",
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
  showMark,
  align,
  tone,
}: {
  size: LogoSize;
  showTagline?: boolean;
  showMark: boolean;
  align: "start" | "center";
  tone: "default" | "light";
}) {
  const wordColor = tone === "light" ? "#FFFFFF" : DESIGN_SYSTEM.colors.oceanDeep;
  const accentColor = DESIGN_SYSTEM.colors.gold;
  const taglineColor = tone === "light" ? "rgba(255,255,255,0.8)" : undefined;
  // When showMark, render the full lockup PNG (mascot + wordmark baked in).
  if (showMark) {
    return (
      <span
        className={cn(
          "inline-flex items-center",
          align === "center" ? "justify-center" : "justify-start",
        )}
      >
        <img
          src={logoMark}
          alt={BRAND.name}
          className={cn("w-auto object-contain", MARK_SIZE[size])}
        />
        {showTagline && (
          <span
            className={cn("ml-3 font-normal", TAGLINE_CLASSES[size])}
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

  return (
    <span
      className={cn(
        "inline-flex items-center gap-2.5",
        align === "center" ? "justify-center" : "justify-start",
      )}
    >
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
          <span style={{ color: accentColor }}>{BRAND.nameParts.leading}</span>
          <span style={{ color: wordColor }}>{BRAND.nameParts.trailing}</span>
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
    </span>
  );
}

export function Logo({
  size = "md",
  as,
  showTagline = false,
  showMark = true,
  align = "start",
  tone = "default",
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
        <Lockup size={size} showTagline={showTagline} showMark={showMark} align={align} tone={tone} />
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
      <Lockup size={size} showTagline={showTagline} showMark={showMark} align={align} tone={tone} />
    </Link>
  );
}

export default Logo;
