import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import confetti from "canvas-confetti";
import { z } from "zod";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { Calendar } from "lucide-react";
import { Logo } from "@/components/brand/Logo";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useBookingsStore } from "@/stores/useBookingsStore";
import { DESIGN_SYSTEM } from "@/lib/brand";
import { displayMentorName } from "@/lib/mentor-display";

const lora = { fontFamily: DESIGN_SYSTEM.fonts.serif };

// Placeholder Calendly URL — swap per-mentor when scheduling lands.
const CALENDLY_URL = "https://calendly.com/aimentor-ing/intro";

const searchSchema = z.object({
  bookingId: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/journey-welcome")({
  validateSearch: zodValidator(searchSchema),
  head: () => ({
    meta: [
      { title: "Welcome to your Course — Lemonaidely" },
      {
        name: "description",
        content:
          "Your Aide is excited to meet you. Book your first session to get started.",
      },
    ],
  }),
  component: JourneyWelcomePage,
});

function JourneyWelcomePage() {
  const { bookingId } = Route.useSearch();
  const booking = useBookingsStore((s) => s.bookings[bookingId]);
  const fired = useRef(false);

  useEffect(() => {
    if (fired.current) return;
    if (
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    fired.current = true;
    confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 } });
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 bg-card/60">
        <div className="mx-auto flex max-w-6xl items-center px-4 py-4">
          <Logo size="md" />
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-12 md:py-16">
        <div className="text-center">
          <h1
            className="text-4xl text-foreground md:text-5xl"
            style={lora}
          >
            Great choice! Your Aide is excited to meet you.
          </h1>
          <p className="mt-3 text-lg text-muted-foreground">
            Let's get you on the schedule.
          </p>
        </div>

        {booking && (
          <Card className="mt-10 rounded-3xl border-border/60 bg-card p-6 md:p-8">
            <div className="flex items-center gap-4">
              {booking.mentorAvatarUrl ? (
                <img
                  src={booking.mentorAvatarUrl}
                  alt={displayMentorName(booking.mentorName)}
                  className="size-14 shrink-0 rounded-2xl object-cover"
                />
              ) : (
                <div className="size-14 shrink-0 rounded-2xl bg-muted" />
              )}
              <div>
                <div className="text-lg text-foreground" style={lora}>
                  {booking.pathTitle}
                </div>
                <div className="text-sm text-muted-foreground">
                  with {displayMentorName(booking.mentorName)}
                </div>
              </div>
            </div>
          </Card>
        )}

        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <Button asChild variant="info" size="lg" className="min-h-12 rounded-2xl">
            <a
              href={CALENDLY_URL}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Calendar className="mr-2 size-4" />
              Book My First Session
            </a>
          </Button>
          <Button asChild variant="ghost" size="lg" className="min-h-12 rounded-2xl">
            <Link to="/">Browse more Courses</Link>
          </Button>
        </div>

        <p className="mt-8 text-center text-xs text-muted-foreground">
          A confirmation has been sent to your email. Need help? Contact support.
        </p>
      </main>
    </div>
  );
}
