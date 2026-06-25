import { useState } from "react";
import { ShieldCheck, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ContactCaptainDialog } from "./ContactCaptainDialog";

interface Props {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
  operatorId: string;
  businessType?: string | null;
}

export function CaptainCard({ name, avatarUrl, verified, operatorId, businessType }: Props) {
  const [open, setOpen] = useState(false);
  const roleLabel = businessType === "guide" ? "Guide" : "Captain";
  const initials = (name || roleLabel)
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  return (
    <div id="contact" className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14">
          {avatarUrl ? <AvatarImage src={avatarUrl} alt={name} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">{roleLabel}</div>
          <div className="truncate text-lg font-semibold">{name || roleLabel}</div>
        </div>
      </div>
      {verified && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          ID &amp; credentials verified
        </div>
      )}
      <Button className="mt-4 w-full" onClick={() => setOpen(true)}>
        <MessageCircle className="mr-2 h-4 w-4" />
        Contact {roleLabel.toLowerCase()}
      </Button>
      <ContactCaptainDialog
        open={open}
        onOpenChange={setOpen}
        operatorId={operatorId}
        captainName={name}
        roleLabel={roleLabel}
      />
    </div>
  );
}
