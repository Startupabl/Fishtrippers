import { useEffect, useMemo, useState } from "react";
import { Facebook, Mail, MessageCircle, Check, Copy } from "lucide-react";

function XIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M18.244 2H21.5l-7.5 8.57L23 22h-6.797l-5.32-6.51L4.8 22H1.54l8.02-9.166L1 2h6.94l4.81 5.95L18.244 2Zm-1.193 18h1.88L7.04 4H5.05l12 16Z" />
    </svg>
  );
}
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface ShareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  location: string;
  url?: string;
}

export function ShareDialog({ open, onOpenChange, title, location, url }: ShareDialogProps) {
  const [copied, setCopied] = useState(false);

  const shareUrl = useMemo(() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.href;
    return "";
  }, [url, open]);

  const message = `I just found amazing trips organized by ${title || "this charter"}${
    location ? ` in ${location}` : ""
  } on FishTrippers. Check it out!`;

  const enc = encodeURIComponent;
  const links = [
    {
      label: "Facebook",
      icon: Facebook,
      href: `https://www.facebook.com/sharer/sharer.php?u=${enc(shareUrl)}&quote=${enc(message)}`,
    },
    {
      label: "Messenger",
      icon: MessageCircle,
      href: `https://www.facebook.com/dialog/send?app_id=140586622674265&link=${enc(shareUrl)}&redirect_uri=${enc(shareUrl)}`,
    },
    {
      label: "X (formerly Twitter)",
      icon: Twitter,
      href: `https://twitter.com/intent/tweet?url=${enc(shareUrl)}&text=${enc(message)}`,
    },
    {
      label: "Email",
      icon: Mail,
      href: `mailto:?subject=${enc(title || "Check out this charter")}&body=${enc(`${message}\n\n${shareUrl}`)}`,
    },
  ];

  useEffect(() => {
    if (!open) setCopied(false);
  }, [open]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // noop
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Share this experience</DialogTitle>
        </DialogHeader>

        <p className="text-sm text-muted-foreground">{message}</p>

        <div className="divide-y rounded-lg border">
          {links.map(({ label, icon: Icon, href }) => (
            <a
              key={label}
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-3 text-sm font-medium text-primary hover:bg-muted/50"
            >
              <Icon className="h-5 w-5" />
              <span>{label}</span>
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-border" />
          <span className="text-xs uppercase text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-border" />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium" htmlFor="share-link-url">
            Share this link
          </label>
          <Input id="share-link-url" readOnly value={shareUrl} onFocus={(e) => e.currentTarget.select()} />
        </div>

        <Button onClick={handleCopy} className="w-full">
          {copied ? (
            <>
              <Check className="mr-2 h-4 w-4" /> Copied!
            </>
          ) : (
            <>
              <Copy className="mr-2 h-4 w-4" /> Copy link
            </>
          )}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
