import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface SessionDescriptionProps {
  text: string;
  className?: string;
}

/**
 * Renders a session description with SEO-safe "Read more" truncation.
 * - Empty text -> renders nothing (no <p>, no spacer, no toggle).
 * - The full text is always present in the DOM; collapse/expand only
 *   toggles a `line-clamp-3` CSS class, never strips text from the DOM.
 */
export function SessionDescription({ text, className }: SessionDescriptionProps) {
  const pRef = useRef<HTMLParagraphElement | null>(null);
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  // Measure overflow only while collapsed. While expanded, preserve the
  // last-known value so the toggle button stays visible.
  useLayoutEffect(() => {
    const el = pRef.current;
    if (!el || expanded) return;
    const measure = () => {
      setOverflows(el.scrollHeight - 1 > el.clientHeight);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [text, expanded]);

  // After collapsing, keep the toggle button in view so the user doesn't
  // lose their place when content shrinks.
  const prevExpandedRef = useRef(expanded);
  useEffect(() => {
    if (prevExpandedRef.current && !expanded) {
      const w = wrapperRef.current;
      if (w) {
        const rect = w.getBoundingClientRect();
        if (rect.top < 0) {
          w.scrollIntoView({ behavior: "smooth", block: "nearest" });
        }
      }
    }
    prevExpandedRef.current = expanded;
  }, [expanded]);

  if (!text?.trim()) return null;

  return (
    <div ref={wrapperRef} className={cn("relative", className)}>
      <p
        ref={pRef}
        className={cn(
          "text-sm text-muted-foreground leading-relaxed whitespace-pre-line transition-[max-height] duration-200",
          !expanded && "line-clamp-3",
        )}
      >
        {text}
      </p>
      {!expanded && overflows && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 h-6 bg-gradient-to-t from-card to-transparent"
        />
      )}
      {overflows && (
        <button
          type="button"
          aria-expanded={expanded}
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            setExpanded((v) => !v);
          }}
          className="mt-1 text-xs font-medium text-info hover:underline"
        >
          {expanded ? "Read less" : "Read more"}
        </button>
      )}
    </div>
  );
}
