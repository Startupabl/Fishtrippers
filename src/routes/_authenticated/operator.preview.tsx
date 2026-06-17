import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { z } from "zod";

import { getMyOperatorListing } from "@/lib/operator-listing.functions";
import { getMyOperator, submitOperatorForReview, upsertOperatorDraft } from "@/lib/operators.functions";
import { PreviewBanner } from "@/components/operator-listing/PreviewBanner";
import { HeaderGallery } from "@/components/operator-listing/HeaderGallery";
import { SectionNav } from "@/components/operator-listing/SectionNav";
import { AboutBlock } from "@/components/operator-listing/AboutBlock";
import { CaptainCard } from "@/components/operator-listing/CaptainCard";
import { TripsBlock } from "@/components/operator-listing/TripsBlock";
import { SpeciesGrid } from "@/components/operator-listing/SpeciesGrid";
import { BoatInfoBlock } from "@/components/operator-listing/BoatInfoBlock";
import { AmenitiesGrid } from "@/components/operator-listing/AmenitiesGrid";
import { PoliciesBlock } from "@/components/operator-listing/PoliciesBlock";
import { WhatsBitingStub } from "@/components/operator-listing/WhatsBitingStub";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import {
  useOperatorOnboardingStore,
  isReadyToSubmit,
} from "@/stores/useOperatorOnboardingStore";
import { submitOperatorSchema } from "@/lib/operators.shared";
import { ConnectPayoutsDialog } from "@/components/operator-onboarding/ConnectPayoutsDialog";

export const Route = createFileRoute("/_authenticated/operator/preview")({
  validateSearch: (search) =>
    z.object({ edit: z.boolean().optional() }).parse(search),
  head: () => ({
    meta: [
      { title: "Listing preview" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OperatorPreviewPage,
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-bold">Couldn&apos;t load preview</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-10 text-center">
      <h1 className="text-2xl font-bold">No listing yet</h1>
    </div>
  ),
});

function OperatorPreviewPage() {
  const fetcher = useServerFn(getMyOperatorListing);
  const fetchMine = useServerFn(getMyOperator);
  const submit = useServerFn(submitOperatorForReview);
  const saveDraft = useServerFn(upsertOperatorDraft);
  const search = Route.useSearch();
  const isEditMode = !!search.edit;
  const navigate = useNavigate();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["operator-listing-preview"],
    queryFn: () => fetcher(),
  });

  // Hydrate the onboarding store so we can validate readiness against the
  // same rules the wizard uses.
  const { data: server } = useQuery({
    queryKey: ["my-operator"],
    queryFn: () => fetchMine(),
    staleTime: 60_000,
  });
  useEffect(() => {
    if (server) useOperatorOnboardingStore.getState().hydrateFromServer(server);
  }, [server]);

  const state = useOperatorOnboardingStore();
  const ready = useMemo(() => isReadyToSubmit(state), [state]);

  const [submitting, setSubmitting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [payoutsOpen, setPayoutsOpen] = useState(false);

  const handleSaveUpdates = async () => {
    setSaving(true);
    try {
      await saveDraft({
        data: {
          operator: {
            business_type: state.business_type ?? null,
            display_name: state.display_name || null,
            location: state.location || null,
            about: state.about || null,
            booking_type: state.booking_type ?? null,
            advance_notice_hours: state.advance_notice_hours ?? null,
            cancellation_policy: state.cancellation_policy ?? null,
            primary_category: state.primary_category ?? null,
            target_species: state.target_species ?? [],
          },
          vessel:
            state.business_type === "charter"
              ? {
                  boat_type_id: state.vessel.boat_type_id || null,
                  manufacturer: state.vessel.manufacturer || null,
                  year: state.vessel.year ? Number(state.vessel.year) : null,
                  length_ft: state.vessel.length_ft ? Number(state.vessel.length_ft) : null,
                  restored: state.vessel.restored,
                  num_engines: state.vessel.num_engines ? Number(state.vessel.num_engines) : null,
                  horsepower_per_engine: state.vessel.horsepower_per_engine
                    ? Number(state.vessel.horsepower_per_engine)
                    : null,
                  max_cruising_speed_knots: state.vessel.max_cruising_speed_knots
                    ? Number(state.vessel.max_cruising_speed_knots)
                    : null,
                  engine_type: state.vessel.engine_manufacturer || null,
                  max_passenger_capacity: state.vessel.max_passenger_capacity
                    ? Number(state.vessel.max_passenger_capacity)
                    : null,
                  features: state.vessel.features ?? {},
                }
              : null,
        },
      } as any);
      await qc.invalidateQueries({ queryKey: ["operator-listing-preview"] });
      await qc.invalidateQueries({ queryKey: ["my-operator"] });
      toast.success("Listing updated");
      navigate({ to: "/dashboard/my-listing" });
    } catch (e: any) {
      toast.error(e?.message || "Could not save updates");
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen">
        <div className="h-14 animate-pulse bg-muted" />
        <div className="mx-auto max-w-6xl space-y-6 p-6">
          <div className="h-10 w-2/3 animate-pulse rounded bg-muted" />
          <div className="h-96 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  const op = data?.operator;
  const vessel = data?.vessel;
  const boatType = data?.boatType;
  const trips = data?.trips ?? [];
  const owner = data?.ownerProfile;

  const status = op?.moderation_status ?? "draft";
  const approved = status === "approved";
  const captainName = owner?.full_name || op?.display_name || "Captain";
  const canSubmit = ready && (status === "draft" || status === "rejected");

  const handleSubmit = async () => {
    if (!canSubmit) {
      toast.error("Finish all onboarding steps before submitting");
      return;
    }
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
        fishing_environments: state.fishing_environments,
        base_currency: state.base_currency || "USD",
        vessel:
          state.business_type === "charter"
            ? {
                boat_type_id: state.vessel.boat_type_id,
                manufacturer: state.vessel.manufacturer.trim() || null,
                year: state.vessel.year ? Number(state.vessel.year) : null,
                length_ft: state.vessel.length_ft ? Number(state.vessel.length_ft) : null,
                restored: state.vessel.restored,
                num_engines: state.vessel.num_engines ? Number(state.vessel.num_engines) : null,
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
      useOperatorOnboardingStore.getState().setSubmitted(true);
      await qc.invalidateQueries({ queryKey: ["operator-listing-preview"] });
      await qc.invalidateQueries({ queryKey: ["my-operator"] });
      toast.success("Listing submitted for review");
      setPayoutsOpen(true);
    } catch (e: any) {
      toast.error(e?.message || "Submission failed");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner
        status={status}
        canSubmit={isEditMode ? false : canSubmit}
        submitting={submitting}
        onSubmit={isEditMode ? undefined : handleSubmit}
      />

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <div className="pt-6">
          <HeaderGallery
            title={op?.display_name ?? ""}
            location={(op as any)?.default_departure_address || op?.location || ""}
            verified={approved}
          />
        </div>

        <SectionNav topOffset={56} />

        {/* About + side rail */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            <AboutBlock
              businessType={op?.business_type}
              about={op?.about}
            />
            <TripsBlock
              trips={trips as any}
              hostId={op?.id ?? null}
              hostHasAvailability={data?.hostHasAvailability ?? false}
            />
            <WhatsBitingStub />
            <PoliciesBlock cancellationPolicy={op?.cancellation_policy ?? null} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <CaptainCard
              name={captainName}
              avatarUrl={owner?.avatar_url}
              verified={approved}
            />
            <SpeciesGrid species={(op?.target_species as string[]) ?? []} />
            {op?.business_type === "charter" && (
              <BoatInfoBlock vessel={vessel} boatType={boatType} />
            )}
            <AmenitiesGrid features={vessel?.features} />
          </aside>
        </div>

        {isEditMode ? (
          <div className="mt-12 rounded-2xl border bg-card p-6 text-center">
            <h2 className="text-xl font-bold">Save your changes</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Updates to your live listing are saved instantly — no admin
              review needed.
            </p>
            <Button
              size="lg"
              className="mt-4"
              onClick={handleSaveUpdates}
              disabled={saving}
            >
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Save updates
            </Button>
          </div>
        ) : (status === "draft" || status === "rejected") && (
          <div className="mt-12 rounded-2xl border bg-card p-6 text-center">
            <h2 className="text-xl font-bold">Ready to go live?</h2>
            <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
              Upload your gallery above, then submit your listing for admin
              review. We&apos;ll get back to you within 24 hours.
            </p>
            <Button
              size="lg"
              className="mt-4"
              onClick={handleSubmit}
              disabled={!canSubmit || submitting}
            >
              {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Submit for approval
            </Button>
            {!ready && (
              <p className="mt-2 text-xs text-muted-foreground">
                Complete every onboarding step to enable submission.
              </p>
            )}
          </div>
        )}
      </main>

      <ConnectPayoutsDialog
        open={payoutsOpen}
        onOpenChange={(o) => {
          setPayoutsOpen(o);
          if (!o) navigate({ to: "/operator/preview" });
        }}
        onLater={() => setPayoutsOpen(false)}
      />
    </div>
  );
}
