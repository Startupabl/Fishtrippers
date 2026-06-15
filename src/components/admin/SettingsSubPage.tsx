import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { Card } from "@/components/ui/card";

export function SettingsSubPage({
  title,
  description,
  children,
  hideStatusFooter = false,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  hideStatusFooter?: boolean;
}) {
  return (
    <div className="space-y-6">
      <Link
        to="/admin/settings"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Back to Settings
      </Link>
      <div>
        <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <Card className="p-6">{children}</Card>
      {!hideStatusFooter && (
        <p className="text-xs text-muted-foreground">
          Coming soon — these controls will be wired to the backend in a future update.
        </p>
      )}
    </div>
  );
}
