import { createFileRoute, notFound, redirect } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { getPublicOperatorListing } from "@/lib/operator-public.functions";
import { getOperatorPhotosPublic } from "@/lib/operator-photos.functions";
import { HeaderGallery } from "@/components/operator-listing/HeaderGallery";
import { SectionNav } from "@/components/operator-listing/SectionNav";
import { AboutBlock } from "@/components/operator-listing/AboutBlock";
import { CaptainCard } from "@/components/operator-listing/CaptainCard";
import { TripsBlock } from "@/components/operator-listing/TripsBlock";
import { SpeciesGrid } from "@/components/operator-listing/SpeciesGrid";
import { BoatInfoBlock } from "@/components/operator-listing/BoatInfoBlock";
import { AmenitiesGrid } from "@/components/operator-listing/AmenitiesGrid";
import { PoliciesBlock } from "@/components/operator-listing/PoliciesBlock";
import { MeetingPointMap } from "@/components/operator-listing/MeetingPointMap";

export const Route = createFileRoute("/charters/$location/$businessSlug")({
  loader: async ({ params }) => {
    const res = await getPublicOperatorListing({
      data: { location: params.location, businessSlug: params.businessSlug },
    });
    if (res.kind === "redirect") {
      throw redirect({
        to: "/charters/$location/$businessSlug",
        params: { location: res.location, businessSlug: res.businessSlug },
        statusCode: 301,
        replace: true,
      });
    }
    if (res.kind === "not_found") throw notFound();
    return res;
  },
  head: ({ loaderData, params }) => {
    const origin =
      typeof window !== "undefined"
        ? window.location.origin
        : "https://fishtrippers.lovable.app";
    const url = `${origin}/charters/${params.location}/${params.businessSlug}`;
    const op: any = loaderData && "operator" in loaderData ? loaderData.operator : null;
    const name = op?.display_name ?? "Fishing charter";
    const city =
      op?.default_departure_city || op?.default_departure_state || "your destination";
    const title = `${name} — ${city} Fishing Charter | FishTrippers`;
    const description =
      op?.about?.slice(0, 155) ||
      `Book ${name}, a fishing ${op?.business_type === "guide" ? "guide" : "charter"} in ${city}.`;
    const image = op?.cover_image_url ?? undefined;
    const meta: Array<Record<string, string>> = [
      { title },
      { name: "description", content: description },
      { property: "og:type", content: "product" },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:url", content: url },
      { property: "og:site_name", content: "FishTrippers" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: title },
      { name: "twitter:description", content: description },
    ];
    if (image) {
      meta.push({ property: "og:image", content: image });
      meta.push({ name: "twitter:image", content: image });
    }
    return { meta, links: [{ rel: "canonical", href: url }] };
  },
  component: OperatorListingPage,
  notFoundComponent: () => (
    <div className="mx-auto max-w-2xl p-16 text-center">
      <h1 className="text-2xl font-bold">Listing not found</h1>
      <p className="mt-2 text-muted-foreground">
        This charter may have been removed or its URL changed.
      </p>
    </div>
  ),
  errorComponent: ({ error }) => (
    <div className="mx-auto max-w-2xl p-16 text-center">
      <h1 className="text-2xl font-bold">Couldn&apos;t load this listing</h1>
      <p className="mt-2 text-muted-foreground">{error.message}</p>
    </div>
  ),
});

function OperatorListingPage() {
  const initial = Route.useLoaderData() as Extract<
    Awaited<ReturnType<typeof getPublicOperatorListing>>,
    { kind: "ok" }
  >;
  const params = Route.useParams();
  const fetcher = useServerFn(getPublicOperatorListing);
  const { data } = useQuery({
    queryKey: ["public-operator", params.location, params.businessSlug],
    queryFn: () => fetcher({ data: params }),
    initialData: initial,
  });

  const photosFetcher = useServerFn(getOperatorPhotosPublic);
  const operatorId =
    data && data.kind === "ok" ? data.operator?.id ?? null : null;
  const { data: photos = [], isLoading: photosLoading } = useQuery({
    queryKey: ["public-operator-photos", operatorId],
    queryFn: () => photosFetcher({ data: { operatorId: operatorId! } }),
    enabled: !!operatorId,
  });

  if (!data || data.kind !== "ok") return null;

  const op = data.operator;
  const vessel = data.vessel;
  const boatType = data.boatType;
  const trips = data.trips ?? [];
  const owner = data.ownerProfile;
  const captainName = owner?.full_name || op?.display_name || "Captain";
  const approved = true;

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto max-w-6xl px-4 pb-24">
        <div className="pt-6">
          <HeaderGallery
            title={op?.display_name ?? ""}
            location={op?.default_departure_address || op?.location || ""}
            shareLocation={
              [op?.default_departure_city, op?.default_departure_state, op?.default_departure_country]
                .filter(Boolean)
                .join(", ") || op?.location || ""
            }
            verified={approved}
            canManage={false}
            photos={photos}
            photosLoading={photosLoading}
          />
        </div>

        <SectionNav topOffset={0} />

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="min-w-0 space-y-8">
            <AboutBlock businessType={op?.business_type} about={op?.about} />
            <TripsBlock
              trips={trips as any}
              hostId={op?.id ?? null}
              hostHasAvailability={data.hostHasAvailability}
            />
            <PoliciesBlock cancellationPolicy={op?.cancellation_policy ?? null} />
            <MeetingPointMap
              address={op?.default_departure_address ?? null}
              lat={op?.default_departure_lat ?? null}
              lng={op?.default_departure_lng ?? null}
            />
          </div>
          <aside className="space-y-4 lg:sticky lg:top-32 lg:self-start">
            <CaptainCard
              name={captainName}
              avatarUrl={owner?.avatar_url}
              verified={approved}
              operatorId={op.id}
            />
            <SpeciesGrid species={(op?.target_species as string[]) ?? []} />
            {op?.business_type === "charter" && (
              <BoatInfoBlock vessel={vessel} boatType={boatType} />
            )}
            <AmenitiesGrid features={vessel?.features} />
          </aside>
        </div>
      </main>
    </div>
  );
}
