import { ReactNode } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AvatarMottoTooltipProps {
  motto?: string | null;
  children: ReactNode;
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * Lightweight text-only tooltip for surfaces where the avatar is already
 * large (listing detail, mentor profile). Shows "Philosophy: {motto}".
 * If no motto is set, returns children unwrapped — no hover effect at all.
 */
export function AvatarMottoTooltip({
  motto,
  children,
  side = "bottom",
}: AvatarMottoTooltipProps) {
  const tag = motto?.trim();
  if (!tag) return <>{children}</>;
  return (
    <TooltipProvider delayDuration={150}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span className="inline-flex">{children}</span>
        </TooltipTrigger>
        <TooltipContent side={side} className="max-w-[20rem] px-3 py-2">
          <p className="text-xs leading-snug">
            <span className="font-semibold">Philosophy:</span>{" "}
            <span className="italic text-muted-foreground">{tag}</span>
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
