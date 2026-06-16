import { Eye, Pencil } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Props {
  status: string | null | undefined;
}

export function PreviewBanner({ status }: Props) {
  const label =
    status === "approved"
      ? "Approved"
      : status === "rejected"
        ? "Needs changes"
        : status === "pending"
          ? "Pending review"
          : "Draft";

  return (
    <div className="sticky top-0 z-50 border-b border-amber-500/40 bg-amber-50 text-amber-950 dark:bg-amber-950/40 dark:text-amber-100">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-2">
          <Eye className="h-4 w-4 shrink-0" />
          <p className="truncate text-sm font-medium">
            You are currently in Preview Mode. This is how your listing will appear to guests.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="border-amber-600/50 bg-white/60 text-amber-900 dark:bg-black/30 dark:text-amber-100">
            {label}
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link to="/mentor/create-path">
              <Pencil className="mr-1.5 h-3.5 w-3.5" />
              Edit Listing
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
