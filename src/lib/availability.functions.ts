// Server functions for mentor weekly availability + global pause switch.

import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const DAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Day = (typeof DAYS)[number];

export const SLOTS = ["morning", "afternoon", "evening"] as const;
export type Slot = (typeof SLOTS)[number];

export type SlotMap = Record<Day, Record<Slot, boolean>>;

export const EMPTY_SLOTS: SlotMap = DAYS.reduce((acc, d) => {
  acc[d] = { morning: false, afternoon: false, evening: false };
  return acc;
}, {} as SlotMap);

export interface AvailabilityRow {
  mentor_id: string;
  paused: boolean;
  slots: SlotMap;
}

const SlotsSchema = z.record(
  z.enum(DAYS),
  z.object({
    morning: z.boolean(),
    afternoon: z.boolean(),
    evening: z.boolean(),
  }),
);

const UpsertInput = z.object({
  paused: z.boolean(),
  slots: SlotsSchema,
});

function normalize(row: { mentor_id: string; paused: boolean | null; slots: unknown } | null, fallbackId?: string): AvailabilityRow {
  const slots = (row?.slots ?? {}) as Partial<SlotMap>;
  const merged: SlotMap = { ...EMPTY_SLOTS };
  for (const d of DAYS) {
    merged[d] = {
      morning: !!slots[d]?.morning,
      afternoon: !!slots[d]?.afternoon,
      evening: !!slots[d]?.evening,
    };
  }
  return {
    mentor_id: row?.mentor_id ?? fallbackId ?? "",
    paused: !!row?.paused,
    slots: merged,
  };
}

export const getMyAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AvailabilityRow> => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("mentor_availability")
      .select("mentor_id, paused, slots")
      .eq("mentor_id", userId)
      .maybeSingle();
    if (error) {
      console.error("[getMyAvailability]", error);
      throw new Error(error.message);
    }
    return normalize(data, userId);
  });

export const upsertMyAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => UpsertInput.parse(input))
  .handler(async ({ data, context }): Promise<AvailabilityRow> => {
    const { supabase, userId } = context;
    const { data: row, error } = await supabase
      .from("mentor_availability")
      .upsert({
        mentor_id: userId,
        paused: data.paused,
        slots: data.slots,
      })
      .select("mentor_id, paused, slots")
      .single();
    if (error) {
      console.error("[upsertMyAvailability]", error);
      throw new Error(error.message);
    }
    return normalize(row, userId);
  });

export const getAvailabilityForMentor = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) =>
    z.object({ mentor_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<AvailabilityRow | null> => {
    const { data: row, error } = await supabase
      .from("mentor_availability")
      .select("mentor_id, paused, slots")
      .eq("mentor_id", data.mentor_id)
      .maybeSingle();
    if (error) {
      console.error("[getAvailabilityForMentor]", error);
      return null;
    }
    if (!row) return null;
    return normalize(row);
  });

// ---------------------------------------------------------------------------
// Helpers shared by client UI for the "usually available" summary line.
// ---------------------------------------------------------------------------

const DAY_LABELS: Record<Day, string> = {
  mon: "Mon",
  tue: "Tue",
  wed: "Wed",
  thu: "Thu",
  fri: "Fri",
  sat: "Sat",
  sun: "Sun",
};

const SLOT_LABELS: Record<Slot, string> = {
  morning: "Mornings",
  afternoon: "Afternoons",
  evening: "Evenings",
};

export function summarizeAvailability(slots: SlotMap): string | null {
  // Group days by their active-slot signature.
  const groups = new Map<string, { days: Day[]; active: Slot[] }>();
  for (const d of DAYS) {
    const active = SLOTS.filter((s) => slots[d][s]);
    if (active.length === 0) continue;
    const key = active.join(",");
    const g = groups.get(key);
    if (g) g.days.push(d);
    else groups.set(key, { days: [d], active });
  }
  if (groups.size === 0) return null;

  const parts: string[] = [];
  for (const { days, active } of groups.values()) {
    const dayStr = days.map((d) => DAY_LABELS[d]).join(", ");
    const slotStr = active.map((s) => SLOT_LABELS[s]).join(" & ");
    parts.push(`${dayStr} — ${slotStr}`);
  }
  return parts.join("; ");
}
