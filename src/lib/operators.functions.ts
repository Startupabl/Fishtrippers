import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  upsertDraftInputSchema,
  submitOperatorSchema,
  type UpsertDraftInput,
  type SubmitOperatorInput,
} from "./operators.shared";

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

    const operatorPayload = {
      owner_id: userId,
      business_type: data.operator.business_type ?? null,
      display_name: data.operator.display_name ?? null,
      location: data.operator.location ?? null,
      about: data.operator.about ?? null,
      booking_type: data.operator.booking_type ?? null,
      advance_notice_hours: data.operator.advance_notice_hours ?? null,
      cancellation_policy: data.operator.cancellation_policy ?? null,
      primary_category: data.operator.primary_category ?? null,
      target_species: data.operator.target_species ?? [],
    };

    const { data: upserted, error } = await supabase
      .from("operators")
      .upsert(operatorPayload, { onConflict: "owner_id" })
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    let vesselRow = null;
    if (data.operator.business_type === "charter" && data.vessel) {
      const vp = data.vessel;
      const vesselPayload = {
        operator_id: upserted.id,
        manufacturer: vp.manufacturer ?? null,
        model: vp.model ?? null,
        year: vp.year ?? null,
        length_ft: vp.length_ft ?? null,
        engine_type: vp.engine_type ?? null,
        engine_size: vp.engine_size ?? null,
        // capacity is NOT NULL on the table; only write the row once we have one
        max_passenger_capacity: vp.max_passenger_capacity ?? 1,
        features: vp.features ?? [],
      };
      // Only insert/update if user has provided at least capacity OR another non-null field
      const hasAny =
        vp.max_passenger_capacity != null ||
        vp.manufacturer ||
        vp.model ||
        vp.year != null ||
        vp.length_ft != null ||
        vp.engine_type ||
        vp.engine_size ||
        (vp.features && vp.features.length > 0);
      if (hasAny) {
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
          primary_category: data.primary_category,
          target_species: data.target_species,
          moderation_status: "pending",
          submitted_at: new Date().toISOString(),
        },
        { onConflict: "owner_id" },
      )
      .select("*")
      .single();
    if (opErr) throw new Error(opErr.message);

    if (data.business_type === "charter" && data.vessel) {
      const v = data.vessel;
      const { error: vErr } = await supabase.from("vessels").upsert(
        {
          operator_id: op.id,
          manufacturer: v.manufacturer,
          model: v.model,
          year: v.year,
          length_ft: v.length_ft,
          engine_type: v.engine_type,
          engine_size: v.engine_size,
          max_passenger_capacity: v.max_passenger_capacity,
          features: v.features ?? [],
        },
        { onConflict: "operator_id" },
      );
      if (vErr) throw new Error(vErr.message);
    } else if (data.business_type === "guide") {
      await supabase.from("vessels").delete().eq("operator_id", op.id);
    }

    return { operator: op };
  });
