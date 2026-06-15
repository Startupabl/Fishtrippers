import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface OnboardingShellProps {
  step: 1 | 2 | 3;
  total?: number;
  headline: string;
  subhead?: string;
  backTo?: string;
  children: React.ReactNode;
}

export function OnboardingShell({
  step,
  total = 3,
  headline,
  subhead,
  backTo,
  children,
}: OnboardingShellProps) {
  return (
    <main className="mx-auto flex min-h-[calc(100vh-12rem)] max-w-2xl flex-col px-4 py-10">
      <div className="flex items-center justify-between">
        {backTo ? (
          <Link
            to={backTo}
            className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Back
          </Link>
        ) : (
          <span />
        )}
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          Step {step} of {total}
        </p>
      </div>

      <div
        className="mt-3 flex items-center gap-1.5"
        role="progressbar"
        aria-valuenow={step}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-1.5 flex-1 rounded-full transition-colors",
              i < step ? "bg-info" : "bg-muted",
            )}
          />
        ))}
      </div>

      <header className="mt-10">
        <h1
          className="text-3xl text-foreground md:text-4xl"
          style={{ fontFamily: "Lora, ui-serif, Georgia, serif" }}
        >
          {headline}
        </h1>
        {subhead && (
          <p className="mt-3 text-base text-muted-foreground">{subhead}</p>
        )}
      </header>

      <div className="mt-8 flex-1">{children}</div>
    </main>
  );
}
