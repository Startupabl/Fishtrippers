import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getMyOperatorListing } from "@/lib/operator-listing.functions";
import { PreviewBanner } from "@/components/operator-listing/PreviewBanner";
import { HeaderGallery } from "@/components/operator-listing/HeaderGallery";
import { SectionNav } from "@/components/operator-listing/SectionNav";
import { AboutBlock } from "@/components/operator-listing/AboutBlock";
import { CaptainCard } from "@/components/operator-listing/CaptainCard";
import { FeaturesCard } from "@/components/operator-listing/FeaturesCard";
import { TripsBlock } from "@/components/operator-listing/TripsBlock";
import { SpeciesGrid } from "@/components/operator-listing/SpeciesGrid";
import { BoatInfoBlock } from "@/components/operator-listing/BoatInfoBlock";
import { AmenitiesGrid } from "@/components/operator-listing/AmenitiesGrid";
import { PoliciesBlock } from "@/components/operator-listing/PoliciesBlock";
import { WhatsBitingStub } from "@/components/operator-listing/WhatsBitingStub";

export const Route = createFileRoute("/_authenticated/operator/preview")({
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
  const { data, isLoading } = useQuery({
    queryKey: ["operator-listing-preview"],
    queryFn: () => fetcher(),
  });

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

  return (
    <div className="min-h-screen bg-background">
      <PreviewBanner status={status} />

      <main className="mx-auto max-w-6xl px-4 pb-24">
        <div className="pt-6">
          <HeaderGallery
            title={op?.display_name ?? ""}
            location={op?.location ?? ""}
            verified={approved}
          />
        </div>

        <SectionNav topOffset={56} />

        {/* About + side rail */}
        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_320px]">
          <div className="space-y-8">
            <AboutBlock
              businessType={op?.business_type}
              about={op?.about}
            />
            <TripsBlock trips={trips as any} />
            <SpeciesGrid species={(op?.target_species as string[]) ?? []} />
            {op?.business_type === "charter" && (
              <BoatInfoBlock vessel={vessel} boatType={boatType} />
            )}
            <AmenitiesGrid features={vessel?.features} />
            <WhatsBitingStub />
            <PoliciesBlock cancellationPolicy={op?.cancellation_policy ?? null} />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <CaptainCard
              name={captainName}
              avatarUrl={owner?.avatar_url}
              verified={approved}
            />
            {op?.business_type === "charter" && (
              <FeaturesCard features={vessel?.features} />
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}
