import { Facebook, Instagram, Linkedin, Link as LinkIcon, X as XIcon } from "lucide-react";
import { toast } from "sonner";
import {
  buildFacebookShare,
  buildLinkedInShare,
  buildXShare,
} from "@/lib/share-links";
import { cn } from "@/lib/utils";
import { displayMentorName } from "@/lib/mentor-display";

interface SharePathProps {
  url: string;
  title: string;
  mentorName: string;
  promoSuffix?: string;
  compact?: boolean;
}

export function SharePath({
  url,
  title,
  mentorName,
  promoSuffix = "",
  compact = false,
}: SharePathProps) {
  const text = `Check out this course: ${title} with ${displayMentorName(mentorName)} on FishTrippers${promoSuffix}`;

  function getShareUrl() {
    if (typeof window !== "undefined") return window.location.href;
    return url;
  }

  function openShare(builder: (u: string) => string) {
    if (typeof window === "undefined") return;
    const href = builder(getShareUrl());
    window.open(href, "_blank", "noopener,noreferrer,width=600,height=540");
  }

  async function copyToClipboard(): Promise<boolean> {
    try {
      await navigator.clipboard.writeText(getShareUrl());
      return true;
    } catch {
      toast.error("Couldn't copy link.");
      return false;
    }
  }

  async function copyForInstagram() {
    if (await copyToClipboard()) {
      toast.success("Link copied! Share it on your Instagram story or bio.");
    }
  }

  async function copyLink() {
    if (await copyToClipboard()) {
      toast.success("Link copied to clipboard!");
    }
  }

  return (
    <section
      className={cn(
        "rounded-2xl border border-border bg-card p-5",
        compact && "p-4",
      )}
      aria-labelledby="share-path-heading"
    >
      <h2
        id="share-path-heading"
        className={cn(
          "font-serif text-foreground",
          compact ? "text-lg" : "text-xl",
        )}
        style={{ fontFamily: 'Montserrat, "Inter", system-ui, sans-serif', fontWeight: 700 }}
      >
        Share this Course
      </h2>
      {!compact && (
        <p className="mt-1 text-sm text-muted-foreground">
          Help your Aide reach their first 5 students.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <IconButton
          label="Share on Facebook"
          bg="#1877F2"
          onClick={() => openShare((u) => buildFacebookShare(u))}
        >
          <Facebook className="size-5" fill="white" stroke="white" />
        </IconButton>

        <IconButton
          label="Share on X"
          bg="#000000"
          onClick={() => openShare((u) => buildXShare(u, text))}
        >
          <XIcon className="size-5" stroke="white" />
        </IconButton>

        <IconButton
          label="Share on LinkedIn"
          bg="#0A66C2"
          onClick={() => openShare((u) => buildLinkedInShare(u))}
        >
          <Linkedin className="size-5" fill="white" stroke="white" />
        </IconButton>

        <IconButton
          label="Copy link for Instagram"
          bg="linear-gradient(45deg, #F58529, #DD2A7B, #8134AF, #515BD4)"
          onClick={copyForInstagram}
        >
          <Instagram className="size-5" stroke="white" />
        </IconButton>
      </div>

      <div className="mt-3">
        <button
          type="button"
          onClick={copyLink}
          className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <LinkIcon className="size-4" />
          Copy Link
        </button>
      </div>
    </section>
  );
}

function IconButton({
  label,
  bg,
  onClick,
  children,
}: {
  label: string;
  bg: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="inline-flex size-11 items-center justify-center rounded-full text-white shadow-sm transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
      style={{ background: bg }}
    >
      {children}
    </button>
  );
}
