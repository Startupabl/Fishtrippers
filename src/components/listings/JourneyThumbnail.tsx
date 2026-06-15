import { useState } from "react";
import { cn } from "@/lib/utils";

interface JourneyThumbnailProps {
  src: string;
  alt: string;
  className?: string;
}

/**
 * Renders a journey thumbnail with a Paper-Cream fallback when the
 * upstream image fails to load.
 */
export function JourneyThumbnail({ src, alt, className }: JourneyThumbnailProps) {
  const [errored, setErrored] = useState(false);

  if (errored) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={cn(
          "flex items-center justify-center bg-[#FDF8F3] text-foreground",
          className,
        )}
      >
        <span
          className="text-5xl font-semibold tracking-wide text-foreground/70"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          AI
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}

interface MentorAvatarProps {
  src: string;
  name: string;
  className?: string;
}

export function MentorAvatar({ src, name, className }: MentorAvatarProps) {
  const [errored, setErrored] = useState(false);
  const initials = name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  if (errored) {
    return (
      <div
        role="img"
        aria-label={name}
        className={cn(
          "flex items-center justify-center bg-[#FDF8F3] text-foreground",
          className,
        )}
      >
        <span className="text-xs font-semibold text-foreground/70">{initials}</span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={name}
      onError={() => setErrored(true)}
      className={cn("object-cover", className)}
      loading="lazy"
    />
  );
}
