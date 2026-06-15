import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  tripInputSchema,
  deleteTripSchema,
  resolvePlaceSchema,
  type TripInput,
  type DeleteTripInput,
  type ResolvePlaceInput,
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
      duration_minutes: data.duration_minutes,
      price_minor: data.price_minor,
      currency: data.currency ?? "USD",
      template_key: data.template_key ?? null,
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
          "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
        },
      },
    );
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Place lookup failed (${res.status}): ${text.slice(0, 200)}`);
    }
    const json: any = await res.json();
    return {
      placeId: json.id as string,
      address: (json.formattedAddress as string) ?? "",
      name: (json.displayName?.text as string) ?? "",
      lat: (json.location?.latitude as number) ?? null,
      lng: (json.location?.longitude as number) ?? null,
    };
  });
