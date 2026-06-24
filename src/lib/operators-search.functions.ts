import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { parseCityStateCountry } from "@/lib/address.shared";
import { isSharedTripType } from "@/lib/trips.shared";


export type OperatorCardDTO = {
  id: string;
  slug: string | null;
  location_slug: string | null;
  display_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  cover_image_url: string | null;
  vessel_length_ft: number | null;
  vessel_capacity: number | null;
  business_type: "charter" | "guide" | null;
  boat_type_icon_url: string | null;
  boat_type_name: string | null;
  booking_type: "instant" | "inquiry" | null;
  fishing_environments: string[];
  primary_environment: string | null;
  verified: boolean;
  rating: number | null;
  review_count: number | null;
  lowest_price_label: string | null; // e.g. "From US $200"
  trip_count: number;
};


const searchSchema = z.object({
  q: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  category: z.string().optional().nullable(), // fishing_environment id (e.g. "inshore")
  instantBook: z.boolean().optional().nullable(),
  limit: z.number().int().min(1).max(60).optional().nullable(),
  featuredOnly: z.boolean().optional().nullable(),
  // Trip-level filters (all optional)
  durationMinMinutes: z.number().int().positive().optional().nullable(),
  durationMaxMinutes: z.number().int().positive().optional().nullable(),
  departureStart: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional().nullable(),
  departureEnd: z.string().regex(/^\d{2}:\d{2}:\d{2}$/).optional().nullable(),
  priceMinMinor: z.number().int().nonnegative().optional().nullable(),
  priceMaxMinor: z.number().int().nonnegative().optional().nullable(),
  techniques: z.array(z.string()).optional().nullable(),
  species: z.array(z.string()).optional().nullable(),
});

const resolvePlacePublicSchema = z.object({ placeId: z.string().min(1) });

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
    if (currency === "USD") return `From US ${formatted}`;
    return `From ${formatted}`;
  } catch {
    return `From ${currency} ${major}`;
  }
}

export const searchOperatorsServer = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof searchSchema>) => searchSchema.parse(d))
  .handler(async ({ data }) => {
    const supabase = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const hasTripFilter =
      data.durationMinMinutes != null ||
      data.durationMaxMinutes != null ||
      !!data.departureStart ||
      !!data.departureEnd ||
      data.priceMinMinor != null ||
      data.priceMaxMinor != null ||
      (data.techniques && data.techniques.length > 0) ||
      (data.species && data.species.length > 0);

    // Use !inner when filtering on trip fields so operators with no matching trip are excluded.
    const tripJoin = hasTripFilter ? "trip_packages!inner" : "trip_packages";

    let query = supabase
      .from("operators")
      .select(
        `
        id, slug, location_slug, display_name, business_type, owner_id,
        default_departure_address,
        default_departure_city, default_departure_state, default_departure_country,
        cover_image_url, booking_type, fishing_environments, featured, priority_order, created_at,
        vessels ( length_ft, max_passenger_capacity, boat_type_id, boat_types ( icon_url, subcategory_name ) ),
        ${tripJoin} ( price_minor, per_extra_minor, charter_type, currency, status, duration_minutes, start_time, techniques, target_species )
      `,
      )


      .eq("moderation_status", "approved")
      .eq("status", "published");

    if (data.featuredOnly) query = query.eq("featured", true);
    if (data.q && data.q.trim()) query = query.ilike("display_name", `%${data.q.trim()}%`);
    if (data.city && data.city.trim())
      query = query.ilike("default_departure_city", `%${data.city.trim()}%`);
    if (data.state && data.state.trim())
      query = query.ilike("default_departure_state", `%${data.state.trim()}%`);
    if (data.country && data.country.trim())
      query = query.ilike("default_departure_country", `%${data.country.trim()}%`);
    if (data.category && data.category.trim())
      query = query.contains("fishing_environments", [data.category.trim()]);
    if (data.instantBook) query = query.eq("booking_type", "instant");

    // Trip-level filters via PostgREST nested filter syntax.
    if (hasTripFilter) {
      if (data.durationMinMinutes != null) {
        query = query.gte("trip_packages.duration_minutes", data.durationMinMinutes);
      }
      if (data.durationMaxMinutes != null) {
        query = query.lte("trip_packages.duration_minutes", data.durationMaxMinutes);
      }
      if (data.departureStart) {
        query = query.gte("trip_packages.start_time", data.departureStart);
      }
      if (data.departureEnd) {
        query = query.lt("trip_packages.start_time", data.departureEnd);
      }
      if (data.priceMinMinor != null) {
        query = query.gte("trip_packages.price_minor", data.priceMinMinor);
      }
      if (data.priceMaxMinor != null) {
        query = query.lte("trip_packages.price_minor", data.priceMaxMinor);
      }
      if (data.techniques && data.techniques.length > 0) {
        query = query.overlaps("trip_packages.techniques", data.techniques);
      }
      if (data.species && data.species.length > 0) {
        query = query.overlaps("trip_packages.target_species", data.species);
      }
    }

    query = query
      .order("featured", { ascending: false })
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);

    const { data: rows, error } = await query;
    if (error) throw error;

    // Aggregate approved reviews per operator (keyed by owner_id == aide_id on reviews).
    const ownerIds = Array.from(
      new Set((rows ?? []).map((r: any) => r.owner_id).filter((id: string | null): id is string => !!id)),
    );
    const statsByOwner = new Map<string, { sum: number; count: number }>();
    if (ownerIds.length > 0) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data: reviewRows } = await supabaseAdmin
        .from("reviews")
        .select("aide_id, rating")
        .in("aide_id", ownerIds);
      for (const r of reviewRows ?? []) {
        const k = r.aide_id as string | null;
        if (!k) continue;
        const cur = statsByOwner.get(k) ?? { sum: 0, count: 0 };
        cur.sum += (r.rating as number) ?? 0;
        cur.count += 1;
        statsByOwner.set(k, cur);
      }
    }

    const items: OperatorCardDTO[] = (rows ?? []).map((row: any) => {
      const vessel = Array.isArray(row.vessels) ? row.vessels[0] : row.vessels;
      const trips: Array<{
        price_minor: number;
        per_extra_minor: number | null;
        charter_type: string | null;
        currency: string;
        status: string;
      }> = row.trip_packages ?? [];
      const active = trips.filter((t) => t.status === "active");
      const candidates = active.length > 0 ? active : trips;
      // Card "From" price = per-additional-guest rate for private trips
      // (falls back to price_minor when per_extra is unset), or per-person
      // price for shared trips (price_minor already is per-person).
      const cardPriceFor = (t: { price_minor: number; per_extra_minor: number | null; charter_type: string | null }) => {
        if (isSharedTripType(t.charter_type as any)) return t.price_minor;
        return t.per_extra_minor && t.per_extra_minor > 0 ? t.per_extra_minor : t.price_minor;
      };
      let cheapest: { price_minor: number; currency: string } | null = null;
      for (const t of candidates) {
        const p = cardPriceFor(t);
        if (!cheapest || p < cheapest.price_minor) {
          cheapest = { price_minor: p, currency: t.currency };
        }
      }

      const boatType = vessel?.boat_types
        ? Array.isArray(vessel.boat_types)
          ? vessel.boat_types[0]
          : vessel.boat_types
        : null;

      const ownerStats = row.owner_id ? statsByOwner.get(row.owner_id) : undefined;
      const reviewCount = ownerStats?.count ?? 0;
      const reviewAvg = ownerStats && ownerStats.count > 0 ? ownerStats.sum / ownerStats.count : null;

      const cityFromDb = row.default_departure_city ?? null;
      const stateFromDb = row.default_departure_state ?? null;
      const countryFromDb = row.default_departure_country ?? null;
      const needsFallback =
        (!cityFromDb || !stateFromDb) && !!row.default_departure_address;
      const fallback = needsFallback
        ? parseCityStateCountry(row.default_departure_address as string)
        : { city: null, state: null, country: null };

      return {
        id: row.id,
        slug: row.slug ?? null,
        location_slug: row.location_slug ?? null,
        display_name: row.display_name ?? "Untitled listing",
        city: cityFromDb || fallback.city,
        state: stateFromDb || fallback.state,
        country: countryFromDb || fallback.country,

        cover_image_url: row.cover_image_url ?? null,
        vessel_length_ft: vessel?.length_ft != null ? Number(vessel.length_ft) : null,
        vessel_capacity: vessel?.max_passenger_capacity ?? null,
        business_type: row.business_type ?? null,
        boat_type_icon_url: boatType?.icon_url ?? null,
        boat_type_name: boatType?.subcategory_name ?? null,
        booking_type: row.booking_type ?? null,
        fishing_environments: row.fishing_environments ?? [],
        primary_environment:
          (row.fishing_environments && row.fishing_environments[0]) ?? null,
        verified: true,
        rating: reviewAvg,
        review_count: reviewCount,
        lowest_price_label: cheapest
          ? formatPrice(cheapest.price_minor, cheapest.currency)
          : null,
        trip_count: active.length > 0 ? active.length : trips.length,
      };
    });


    return { items };
  });

// Public Google Place resolver (no auth) — used by homepage hero and /search bar.
export const resolvePlacePublic = createServerFn({ method: "POST" })
  .inputValidator((d: z.input<typeof resolvePlacePublicSchema>) =>
    resolvePlacePublicSchema.parse(d),
  )
  .handler(async ({ data }) => {
    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!lovableKey || !mapsKey) {
      throw new Error("Google Maps connector not configured");
    }
    const res = await fetch(
      `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(data.placeId)}`,
      {
        headers: {
          Authorization: `Bearer ${lovableKey}`,
          "X-Connection-Api-Key": mapsKey,
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location,addressComponents",
        },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Place lookup failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json: any = await res.json();
    const components: any[] = Array.isArray(json.addressComponents)
      ? json.addressComponents
      : [];
    const findComp = (type: string, short = false): string | null => {
      const c = components.find((x) => Array.isArray(x.types) && x.types.includes(type));
      if (!c) return null;
      return (short ? c.shortText : c.longText) ?? c.longText ?? c.shortText ?? null;
    };
    const city =
      findComp("locality") ||
      findComp("postal_town") ||
      findComp("sublocality") ||
      findComp("administrative_area_level_2") ||
      null;
    const state = findComp("administrative_area_level_1", true);
    const country = findComp("country", true);
    return {
      placeId: json.id as string,
      address: (json.formattedAddress as string) ?? "",
      name: (json.displayName?.text as string) ?? "",
      lat: (json.location?.latitude as number) ?? null,
      lng: (json.location?.longitude as number) ?? null,
      city,
      state,
      country,
    };
  });
