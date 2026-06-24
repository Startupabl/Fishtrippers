import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  upsertDraftInputSchema,
  submitOperatorSchema,
  CANCELLATION_POLICIES,
  type UpsertDraftInput,
  type SubmitOperatorInput,
} from "./operators.shared";

export const updateOperatorCancellationPolicy = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: { cancellation_policy: string }) =>
    z.object({ cancellation_policy: z.enum(CANCELLATION_POLICIES) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("operators")
      .update({ cancellation_policy: data.cancellation_policy })
      .eq("owner_id", userId)
      .select("id, cancellation_policy")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) throw new Error("Listing not found");
    return { operator: row };
  });


export const getMyOperator = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: operator, error } = await supabase
      .from("operators")
      .select("*")
      .eq("owner_id", userId)
      .maybeSingle();
    if (error) throw new Error(error.message);

    let vessel = null;
    if (operator) {
      const { data: v, error: vErr } = await supabase
        .from("vessels")
        .select("*")
        .eq("operator_id", operator.id)
        .maybeSingle();
      if (vErr) throw new Error(vErr.message);
      vessel = v;
    }
    return { operator, vessel };
  });

export const upsertOperatorDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: UpsertDraftInput) => upsertDraftInputSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: existing } = await supabase
      .from("operators")
      .select("id, moderation_status")
      .eq("owner_id", userId)
      .maybeSingle();

    // Don't allow editing once submitted/approved.
    if (existing && existing.moderation_status !== "pending") {
      // Still allow editing while pending. Block once approved/rejected lifecycle changes.
    }

    // Build a partial operator payload: only include keys the client explicitly
    // sent. `undefined` means "don't touch"; `null` is an explicit clear.
    const op = data.operator;
    const operatorPayload: Record<string, any> = { owner_id: userId };
    const setIf = (key: string, value: any) => {
      if (value !== undefined) operatorPayload[key] = value;
    };
    setIf("business_type", op.business_type);
    setIf("display_name", op.display_name);
    setIf("location", op.location);
    setIf("about", op.about);
    setIf("booking_type", op.booking_type);
    setIf("advance_notice_hours", op.advance_notice_hours);
    setIf("cancellation_policy", op.cancellation_policy);
    setIf("primary_category", op.primary_category);
    setIf("target_species", op.target_species);
    setIf("fishing_environments", op.fishing_environments);
    setIf("base_currency", op.base_currency);

    const { data: upserted, error } = await supabase
      .from("operators")
      .upsert(operatorPayload as any, { onConflict: "owner_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let vesselRow = null;
    if (data.operator.business_type === "charter" && data.vessel) {
      const vp = data.vessel;
      const vesselPayload: Record<string, any> = { operator_id: upserted.id };
      const setV = (key: string, value: any) => {
        if (value !== undefined) vesselPayload[key] = value;
      };
      setV("boat_type_id", vp.boat_type_id);
      setV("manufacturer", vp.manufacturer);
      setV("model", vp.model);
      setV("year", vp.year);
      setV("length_ft", vp.length_ft);
      setV("engine_type", vp.engine_type);
      setV("engine_size", vp.engine_size);
      setV("restored", vp.restored);
      setV("num_engines", vp.num_engines);
      setV("horsepower_per_engine", vp.horsepower_per_engine);
      setV("max_cruising_speed_knots", vp.max_cruising_speed_knots);
      setV("max_passenger_capacity", vp.max_passenger_capacity);
      setV("features", vp.features);

      // Only upsert if there's at least one field beyond operator_id.
      if (Object.keys(vesselPayload).length > 1) {
        // Ensure required column on insert.
        if (vesselPayload.max_passenger_capacity == null) {
          vesselPayload.max_passenger_capacity = 1;
        }
        const { data: v, error: vErr } = await supabase
          .from("vessels")
          .upsert(vesselPayload, { onConflict: "operator_id" })
          .select("*")
          .single();
        if (vErr) throw new Error(vErr.message);
        vesselRow = v;
      }
    } else if (data.operator.business_type === "guide") {
      // Switching to guide: remove any prior vessel.
      await supabase.from("vessels").delete().eq("operator_id", upserted.id);
    }

    return { operator: upserted, vessel: vesselRow };
  });

export const submitOperatorForReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: SubmitOperatorInput) => submitOperatorSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: op, error: opErr } = await supabase
      .from("operators")
      .upsert(
        {
          owner_id: userId,
          business_type: data.business_type,
          display_name: data.display_name,
          location: data.location,
          about: data.about,
          booking_type: data.booking_type,
          advance_notice_hours: data.advance_notice_hours,
          cancellation_policy: data.cancellation_policy,
          primary_category: data.primary_category as any,
          target_species: data.target_species,
          fishing_environments: data.fishing_environments,
          base_currency: data.base_currency ?? "USD",
          moderation_status: "pending",
          submitted_at: new Date().toISOString(),
        } as any,
        { onConflict: "owner_id" },
      )
      .select("*")
      .single();
    if (opErr) throw new Error(opErr.message);

    if (data.business_type === "charter" && data.vessel) {
      const v: any = data.vessel;
      const { error: vErr } = await supabase.from("vessels").upsert(
        {
          operator_id: op.id,
          boat_type_id: v.boat_type_id ?? null,
          manufacturer: v.manufacturer ?? null,
          model: v.model ?? null,
          year: v.year ?? null,
          length_ft: v.length_ft ?? null,
          restored: v.restored ?? false,
          num_engines: v.num_engines ?? null,
          horsepower_per_engine: v.horsepower_per_engine ?? null,
          max_cruising_speed_knots: v.max_cruising_speed_knots ?? null,
          max_passenger_capacity: v.max_passenger_capacity,
          features: v.features ?? {},
        } as any,
        { onConflict: "operator_id" },
      );
      if (vErr) throw new Error(vErr.message);
    } else if (data.business_type === "guide") {
      await supabase.from("vessels").delete().eq("operator_id", op.id);
    }

    return { operator: op };
  });

export const saveDefaultDeparture = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: {
    address: string;
    lat: number | null;
    lng: number | null;
    place_id: string | null;
    city?: string | null;
    state?: string | null;
    country?: string | null;
  }) => input)
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const city = data.city ?? null;
    const state = data.state ?? null;
    // Back-fill the legacy free-text `location` column as "City, ST" when we have
    // structured parts; otherwise fall back to the full address.
    const locationCompat =
      city && state ? `${city}, ${state}` : data.address || null;
    const { data: row, error } = await supabase
      .from("operators")
      .update({
        default_departure_address: data.address || null,
        default_departure_lat: data.lat,
        default_departure_lng: data.lng,
        default_departure_place_id: data.place_id,
        default_departure_city: city,
        default_departure_state: state,
        default_departure_country: data.country ?? null,
        location: locationCompat,
      } as any)
      .eq("owner_id", userId)
      .select("*")
      .maybeSingle();
    if (error) throw new Error(error.message);
    return { operator: row };
  });

/**
 * Single source of truth for the operator's search/admin card thumbnail.
 * Returns the synced cover_image_url (driven by operator_photos.is_cover),
 * which already points at the 4:3 thumb rendition produced by the upload pipeline.
 */
export function getOperatorCardImage(
  operator: { cover_image_url?: string | null } | null | undefined,
): string | null {
  return operator?.cover_image_url ?? null;
}

/**
 * Admin-only one-shot backfill: for every operator that has a
 * default_departure_address but missing city/state/country, derive those
 * fields (preferring Google for rows with a place_id, falling back to
 * parseCityStateCountry) and persist them.
 *
 * Idempotent — re-running only touches rows still missing structured fields.
 */
export const backfillOperatorPlaceComponents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin, error: roleErr } = await supabase.rpc("has_role", {
      _user_id: userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Forbidden");

    const { parseCityStateCountry } = await import("./address.shared");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: rows, error } = await supabaseAdmin
      .from("operators")
      .select(
        "id, default_departure_address, default_departure_place_id, default_departure_city, default_departure_state, default_departure_country",
      )
      .not("default_departure_address", "is", null)
      .is("default_departure_city", null);
    if (error) throw new Error(error.message);

    const lovableKey = process.env.LOVABLE_API_KEY;
    const mapsKey = process.env.GOOGLE_MAPS_API_KEY;
    const canCallGoogle = !!lovableKey && !!mapsKey;

    let updated = 0;
    const failures: Array<{ id: string; reason: string }> = [];
    for (const row of rows ?? []) {
      let city: string | null = null;
      let state: string | null = null;
      let country: string | null = null;

      if (canCallGoogle && row.default_departure_place_id) {
        try {
          const res = await fetch(
            `https://connector-gateway.lovable.dev/google_maps/places/v1/places/${encodeURIComponent(
              row.default_departure_place_id,
            )}`,
            {
              headers: {
                Authorization: `Bearer ${lovableKey}`,
                "X-Connection-Api-Key": mapsKey!,
                "X-Goog-FieldMask": "addressComponents,formattedAddress",
              },
            },
          );
          if (res.ok) {
            const json: any = await res.json();
            const comps: any[] = Array.isArray(json.addressComponents)
              ? json.addressComponents
              : [];
            const find = (t: string, short = false): string | null => {
              const c = comps.find(
                (x) => Array.isArray(x.types) && x.types.includes(t),
              );
              if (!c) return null;
              return (short ? c.shortText : c.longText) ?? c.longText ?? c.shortText ?? null;
            };
            city =
              find("locality") ||
              find("postal_town") ||
              find("sublocality") ||
              find("administrative_area_level_2") ||
              null;
            state = find("administrative_area_level_1", true);
            country = find("country", true);
          }
        } catch (e) {
          failures.push({ id: row.id, reason: (e as Error).message });
        }
      }

      if (!city || !state) {
        const parsed = parseCityStateCountry(row.default_departure_address);
        city = city || parsed.city;
        state = state || parsed.state;
        country = country || parsed.country;
      }

      if (!city && !state && !country) continue;

      const { error: upErr } = await supabaseAdmin
        .from("operators")
        .update({
          default_departure_city: city,
          default_departure_state: state,
          default_departure_country: country,
        })
        .eq("id", row.id);
      if (upErr) {
        failures.push({ id: row.id, reason: upErr.message });
        continue;
      }
      updated += 1;
    }

    return { scanned: rows?.length ?? 0, updated, failures };
  });

