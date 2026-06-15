import { CheckCircle2, Mail, Calendar, Image as ImageIcon, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@tanstack/react-router";

export function SubmittedScreen() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-2xl space-y-8 py-12 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-950/40">
        <CheckCircle2 className="h-10 w-10 text-emerald-600" />
      </div>
      <div className="space-y-3">
        <h1 className="text-3xl font-bold tracking-tight">Submitted for review</h1>
        <p className="text-lg text-muted-foreground">
          Your listing is now in the queue. While you wait, it's live in our directory as
          <span className="mx-1 inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-sm font-semibold">
            Contact to Book
          </span>
          so customers can reach you.
        </p>
      </div>

      <div className="rounded-2xl border bg-card p-6 text-left">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          What unlocks after approval
        </h2>
        <ul className="space-y-3 text-sm">
          <li className="flex items-start gap-3">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>You'll get an approval email the moment an admin clears your listing.</span>
          </li>
          <li className="flex items-start gap-3">
            <Calendar className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Trip Builder</strong> — convert your directory entry into bookable
              calendar trips.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <ImageIcon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Media gallery</strong> — upload photos and videos of your boat and recent
              catches.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <Users className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>
              <strong>Crew management</strong> — add deckhands and co-captains.
            </span>
          </li>
        </ul>
      </div>

      <div className="flex justify-center gap-3">
        <Button variant="outline" onClick={() => navigate({ to: "/" })}>
          Back to home
        </Button>
      </div>
    </div>
  );
}
