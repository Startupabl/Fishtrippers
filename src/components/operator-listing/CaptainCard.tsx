import { ShieldCheck, MessageCircle } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

interface Props {
  name: string;
  avatarUrl?: string | null;
  verified?: boolean;
}

export function CaptainCard({ name, avatarUrl, verified }: Props) {
  const initials = (name || "C")
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
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Captain</div>
          <div className="truncate text-lg font-semibold">{name || "Captain"}</div>
        </div>
      </div>
      {verified && (
        <div className="mt-3 flex items-center gap-1.5 text-sm text-emerald-700 dark:text-emerald-400">
          <ShieldCheck className="h-4 w-4" />
          ID &amp; credentials verified
        </div>
      )}
      <Button
        className="mt-4 w-full"
        onClick={() => toast.info("Contact captain — available after approval")}
      >
        <MessageCircle className="mr-2 h-4 w-4" />
        Contact captain
      </Button>
    </div>
  );
}
