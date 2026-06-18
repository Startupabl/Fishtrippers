import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  tripInputSchema,
  deleteTripSchema,
  resolvePlaceSchema,
  setTripStatusSchema,
  type TripInput,
  type DeleteTripInput,
  type ResolvePlaceInput,
  type SetTripStatusInput,
} from "./trips.shared";

async function resolveOperatorId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("operators")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Operator profile not found — complete earlier steps first.");
  return data.id as string;
}

export const listMyTrips = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: op } = await supabase
      .from("operators")
      .select("id")
      .eq("owner_id", userId)
      .maybeSingle();
    if (!op) return { trips: [] as any[] };
    const { data, error } = await supabase
      .from("trip_packages")
      .select("*")
      .eq("operator_id", op.id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return { trips: data ?? [] };
  });

export const getMyCapabilities = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("operators")
      .select("target_species, fishing_environments, base_currency")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return {
      target_species: (data?.target_species as string[]) ?? [],
      fishing_environments: (data?.fishing_environments as string[]) ?? [],
      base_currency: (data?.base_currency as string) ?? "USD",
    };
  });

export const upsertTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: TripInput) => tripInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await resolveOperatorId(supabase, userId);

    const payload = {
      operator_id: operatorId,
      title: data.title,
      description: data.description,
      start_time: data.start_time ?? null,
      duration_minutes: data.duration_minutes,
      price_minor: data.price_minor,
      per_extra_minor: data.per_extra_minor ?? 0,
      min_party_size: data.min_party_size ?? 1,
      max_party_size: data.max_party_size,
      currency: data.currency ?? "USD",
      template_key: data.template_key ?? null,
      booking_type: data.booking_type ?? "request_to_book",
      target_species: data.target_species,
      environments: data.environments,
      techniques: data.techniques,
      departure_address: data.departure_address,
      departure_lat: data.departure_lat ?? null,
      departure_lng: data.departure_lng ?? null,
      departure_place_id: data.departure_place_id ?? null,
    } as any;

    if (data.id) {
      const { data: row, error } = await supabase
        .from("trip_packages")
        .update(payload)
        .eq("id", data.id)
        .eq("operator_id", operatorId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { trip: row };
    }

    const { data: row, error } = await supabase
      .from("trip_packages")
      .insert(payload)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { trip: row };
  });

export const deleteTrip = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: DeleteTripInput) => deleteTripSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await resolveOperatorId(supabase, userId);
    const { error } = await supabase
      .from("trip_packages")
      .delete()
      .eq("id", data.id)
      .eq("operator_id", operatorId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setTripStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SetTripStatusInput) => setTripStatusSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const operatorId = await resolveOperatorId(supabase, userId);
    const { data: row, error } = await supabase
      .from("trip_packages")
      .update({ status: data.status })
      .eq("id", data.id)
      .eq("operator_id", operatorId)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return { trip: row };
  });

// Resolve a Google Place via gateway (server holds the connector key).
export const resolvePlace = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ResolvePlaceInput) => resolvePlaceSchema.parse(input))
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
