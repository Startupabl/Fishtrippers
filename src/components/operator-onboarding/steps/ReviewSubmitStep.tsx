import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { useNavigate } from "@tanstack/react-router";
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
import { supabase } from "@/integrations/supabase/client";
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
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [boatTypeName, setBoatTypeName] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    const id = state.vessel.boat_type_id;
    if (!id) return;
    (async () => {
      const { data } = await supabase
        .from("boat_types" as any)
        .select("subcategory_name")
        .eq("id", id)
        .maybeSingle();
      if (!cancelled && data) setBoatTypeName((data as any).subcategory_name);
    })();
    return () => {
      cancelled = true;
    };
  }, [state.vessel.boat_type_id]);

  const handleSubmit = async () => {
    if (!ready) return;
    setSubmitting(true);
    try {
      const payload = submitOperatorSchema.parse({
        business_type: state.business_type,
        display_name: state.display_name.trim(),
        location: state.location.trim(),
        about: state.about.trim(),
        booking_type: state.booking_type,
        advance_notice_hours: state.advance_notice_hours,
        cancellation_policy: state.cancellation_policy,
        primary_category: state.primary_category,
        target_species: state.target_species,
        vessel:
          state.business_type === "charter"
            ? {
                boat_type_id: state.vessel.boat_type_id,
                manufacturer: state.vessel.manufacturer.trim() || null,
                year: state.vessel.year ? Number(state.vessel.year) : null,
                length_ft: state.vessel.length_ft
                  ? Number(state.vessel.length_ft)
                  : null,
                restored: state.vessel.restored,
                num_engines: state.vessel.num_engines
                  ? Number(state.vessel.num_engines)
                  : null,
                horsepower_per_engine: state.vessel.horsepower_per_engine
                  ? Number(state.vessel.horsepower_per_engine)
                  : null,
                max_cruising_speed_knots: state.vessel.max_cruising_speed_knots
                  ? Number(state.vessel.max_cruising_speed_knots)
                  : null,
                max_passenger_capacity: Number(state.vessel.max_passenger_capacity),
                features: state.vessel.features,
              }
            : null,
      });
      await submit({ data: payload });
      setSubmitted(true);
      toast.success("Listing submitted for review");
      navigate({ to: "/operator/preview" });
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  const featureEntries = Object.entries(state.vessel.features);

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
          <Field label="Type">
            <span className="capitalize">{state.business_type}</span>
          </Field>
          <Field label="Display name">{state.display_name}</Field>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted-foreground">Location</dt>
            <dd className="font-medium">{state.location}</dd>
          </div>
          {state.about?.trim() ? (
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase text-muted-foreground">About</dt>
              <dd className="whitespace-pre-wrap text-sm">{state.about}</dd>
            </div>
          ) : null}
        </dl>
      </section>

      {state.business_type === "charter" && (
        <section className="space-y-4 rounded-2xl border bg-card p-6">
          <h2 className="text-lg font-semibold">Vessel</h2>
          <dl className="grid gap-3 sm:grid-cols-2">
            <Field label="Boat type">{boatTypeName || state.vessel.boat_type_id || "—"}</Field>
            <Field label="Manufacturer">{state.vessel.manufacturer || "—"}</Field>
            <Field label="Length">
              {state.vessel.length_ft ? `${state.vessel.length_ft} ft` : "—"}
            </Field>
            <Field label="Year">{state.vessel.year || "—"}</Field>
            <Field label="Restored">{state.vessel.restored ? "Yes" : "No"}</Field>
            <Field label="Engine manufacturer">
              {state.vessel.engine_manufacturer || "—"}
            </Field>
            <Field label="# Engines">{state.vessel.num_engines || "—"}</Field>
            <Field label="HP per engine">{state.vessel.horsepower_per_engine || "—"}</Field>
            <Field label="Max cruising speed">
              {state.vessel.max_cruising_speed_knots
                ? `${state.vessel.max_cruising_speed_knots} kn`
                : "—"}
            </Field>
            <Field label="Max passengers">{state.vessel.max_passenger_capacity}</Field>
          </dl>
          <div>
            <div className="mb-2 text-xs uppercase text-muted-foreground">Features</div>
            {featureEntries.length === 0 ? (
              <p className="text-sm text-muted-foreground">None selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {featureEntries.map(([id, comment]) => (
                  <Badge key={id} variant="secondary" className="font-normal">
                    {findLabel(id)}
                    {comment ? (
                      <span className="ml-1 text-muted-foreground">— {comment}</span>
                    ) : null}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </section>
      )}

      <section className="space-y-4 rounded-2xl border bg-card p-6">
        <h2 className="text-lg font-semibold">Fishing focus</h2>
        <dl className="grid gap-3 sm:grid-cols-2">
          <Field label="Primary category">
            {state.primary_category
              ? PRIMARY_CATEGORY_DETAILS[state.primary_category].title
              : "—"}
          </Field>
          <div className="sm:col-span-2">
            <dt className="text-xs uppercase text-muted-foreground">Target species</dt>
            {state.target_species.length === 0 ? (
              <p className="mt-1 text-sm text-muted-foreground">None selected</p>
            ) : (
              <div className="mt-2 flex flex-wrap gap-2">
                {state.target_species.map((s) => (
                  <Badge key={s} variant="secondary">
                    {speciesLabel(s)}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </dl>
      </section>

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
