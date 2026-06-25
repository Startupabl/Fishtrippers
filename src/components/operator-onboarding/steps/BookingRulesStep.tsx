import { CheckCircle2, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ADVANCE_NOTICE_OPTIONS,
  CANCELLATION_POLICIES,
  CANCELLATION_POLICY_DETAILS,
  WEATHER_POLICY_DISCLAIMER,
  type AdvanceNoticeHours,
  type CancellationPolicy,
} from "@/lib/operators.shared";
import {
  isBookingRulesValid,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
  onNext: () => void;
}

export function BookingRulesStep({ onBack, onNext }: Props) {
  const advance_notice_hours = useOperatorOnboardingStore((s) => s.advance_notice_hours);
  const cancellation_policy = useOperatorOnboardingStore((s) => s.cancellation_policy);
  const setBookingRules = useOperatorOnboardingStore((s) => s.setBookingRules);
  const valid = useOperatorOnboardingStore(isBookingRulesValid);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Booking rules & policy</h1>
        <p className="mt-2 text-muted-foreground">
          Last stop before submitting — set your booking notice and cancellation terms.
          You'll choose Instant Book or Request to Book from your Manage Availability page after submitting.
        </p>
      </header>


      {/* Advance notice */}
      <section className="space-y-3 rounded-2xl border bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Advance notice</h2>
          <p className="text-sm text-muted-foreground">
            Minimum lead time between booking and trip departure.
          </p>
        </div>
        <div className="max-w-xs">
          <Label htmlFor="notice" className="sr-only">
            Required notice
          </Label>
          <Select
            value={advance_notice_hours ? String(advance_notice_hours) : ""}
            onValueChange={(v) =>
              setBookingRules({ advance_notice_hours: Number(v) as AdvanceNoticeHours })
            }
          >
            <SelectTrigger id="notice">
              <SelectValue placeholder="Choose required notice" />
            </SelectTrigger>
            <SelectContent>
              {ADVANCE_NOTICE_OPTIONS.map((h) => (
                <SelectItem key={h} value={String(h)}>
                  {h} hours
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </section>

      {/* Cancellation policy */}
      <section className="space-y-4 rounded-2xl border bg-card p-4 sm:p-6">
        <div>
          <h2 className="text-lg font-semibold">Cancellation & refund policy</h2>
          <p className="text-sm text-muted-foreground">
            Pick the standard terms that govern customer cancellations.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {CANCELLATION_POLICIES.map((id) => {
            const policy = CANCELLATION_POLICY_DETAILS[id];
            const selected = cancellation_policy === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setBookingRules({ cancellation_policy: id as CancellationPolicy })}
                className={cn(
                  "relative flex flex-col gap-3 rounded-xl border-2 p-5 text-left transition-all",
                  selected
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary/40",
                )}
              >
                {selected && (
                  <CheckCircle2 className="absolute right-3 top-3 h-5 w-5 text-primary" />
                )}
                <div>
                  <div className="text-lg font-bold">{policy.title}</div>
                  <div className="text-xs text-muted-foreground">{policy.summary}</div>
                </div>
                <ul className="space-y-2 text-sm">
                  {policy.terms.map((t, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-muted-foreground">•</span>
                      <span>{t}</span>
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {/* Weather policy */}
      <section className="flex gap-3 rounded-2xl border-2 border-amber-300/50 bg-amber-50/50 p-5 dark:bg-amber-950/20">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div>
          <div className="text-sm font-bold uppercase tracking-wide text-amber-900 dark:text-amber-300">
            Universal Weather Policy
          </div>
          <p className="mt-1 text-sm text-amber-950 dark:text-amber-100">
            {WEATHER_POLICY_DISCLAIMER}
          </p>
        </div>
      </section>

      <div className="flex justify-between pt-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button disabled={!valid} onClick={onNext} size="lg">
          Continue to review
        </Button>
      </div>
    </div>
  );
}
