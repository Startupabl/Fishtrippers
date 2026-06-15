import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BOAT_FEATURE_GROUPS,
  CANCELLATION_POLICY_DETAILS,
  PRIMARY_CATEGORY_DETAILS,
  speciesLabel,
  submitOperatorSchema,
} from "@/lib/operators.shared";
import { submitOperatorForReview } from "@/lib/operators.functions";
import {
  isReadyToSubmit,
  useOperatorOnboardingStore,
} from "@/stores/useOperatorOnboardingStore";

interface Props {
  onBack: () => void;
}

function findLabel(id: string): string {
  for (const g of BOAT_FEATURE_GROUPS) {
    const m = g.items.find((i) => i.id === id);
    if (m) return m.label;
  }
  return id;
}

export function ReviewSubmitStep({ onBack }: Props) {
  const state = useOperatorOnboardingStore();
  const ready = useOperatorOnboardingStore(isReadyToSubmit);
  const setSubmitted = useOperatorOnboardingStore((s) => s.setSubmitted);
  const submit = useServerFn(submitOperatorForReview);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      const payload = submitOperatorSchema.parse({
        business_type: state.business_type,
        display_name: state.display_name.trim(),
        location: state.location.trim(),
        booking_type: state.booking_type,
        advance_notice_hours: state.advance_notice_hours,
        cancellation_policy: state.cancellation_policy,
        primary_category: state.primary_category,
        target_species: state.target_species,
        vessel:
          state.business_type === "charter"
            ? {
                manufacturer: state.vessel.manufacturer.trim(),
                model: state.vessel.model.trim(),
                year: Number(state.vessel.year),
                length_ft: Number(state.vessel.length_ft),
                engine_type: state.vessel.engine_type.trim(),
                engine_size: state.vessel.engine_size.trim(),
                max_passenger_capacity: Number(state.vessel.max_passenger_capacity),
                features: state.vessel.features,
              }
            : null,
      });
      await submit({ data: payload });
      setSubmitted(true);
      toast.success("Listing submitted for review");
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-3xl font-bold tracking-tight">Review & submit</h1>
        <p className="mt-2 text-muted-foreground">
          Double-check everything below. After submitting, an admin reviews your listing — usually
          within 24 hours.
        </p>
      </header>

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Business</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Type</dt>
            <dd className="font-medium capitalize">{state.business_type}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Display name</dt>
            <dd className="font-medium">{state.display_name}</dd>
          </div>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted-foreground">Location</dt>
            <dd className="font-medium">{state.location}</dd>
          </div>
        </dl>
      </section>

      {state.business_type === "charter" && (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Vessel</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Make">{state.vessel.manufacturer}</Field>
            <Field label="Model">{state.vessel.model}</Field>
            <Field label="Year">{state.vessel.year}</Field>
            <Field label="Length">{state.vessel.length_ft} ft</Field>
            <Field label="Engine type">{state.vessel.engine_type}</Field>
            <Field label="Engine size">{state.vessel.engine_size}</Field>
            <Field label="Max passengers">{state.vessel.max_passenger_capacity}</Field>
          </dl>
          <div>
            <div className="mb-2 text-xs uppercase text-muted-foreground">Features</div>
            {state.vessel.features.length === 0 ? (
              <p className="text-sm text-muted-foreground">None selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {state.vessel.features.map((f) => (
                  <Badge key={f} variant="secondary">
                    {findLabel(f)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Booking rules</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="Booking type">
            {state.booking_type === "instant" ? "Instant Book" : "Inquiry Only"}
          </Field>
          <Field label="Advance notice">{state.advance_notice_hours} hours</Field>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted-foreground">Cancellation policy</dt>
            <dd className="mt-1 font-medium">
              {state.cancellation_policy &&
                CANCELLATION_POLICY_DETAILS[state.cancellation_policy].title}
            </dd>
            {state.cancellation_policy && (
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {CANCELLATION_POLICY_DETAILS[state.cancellation_policy].terms.map((t, i) => (
                  <li key={i}>• {t}</li>
                ))}
              </ul>
            )}
          </div>
        </dl>
      </section>

      <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
        <Button variant="ghost" onClick={onBack} disabled={submitting}>
          Back
        </Button>
        <Button size="lg" onClick={handleSubmit} disabled={!ready || submitting}>
          {submitting ? "Submitting…" : "Submit for approval"}
        </Button>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
