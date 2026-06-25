import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
import { isSharedTripType, type TripType } from "@/lib/trips.shared";

export interface HostAvailabilityRow {
  date: string; // YYYY-MM-DD
  status: "booked" | "blocked";
}

async function resolveOperatorId(supabase: any, userId: string) {
  const { data, error } = await supabase
    .from("operators")
    .select("id")
    .eq("owner_id", userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("No listing found.");
  return data.id as string;
}

export const listMyHostAvailability = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<HostAvailabilityRow[]> => {
    const { supabase, userId } = context;
    const opId = await resolveOperatorId(supabase, userId);
    const { data, error } = await supabase
      .from("host_availability")
      .select("date, status")
      .eq("host_id", opId);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r: any) => ({ date: r.date, status: r.status }));
  });

export const setMyHostAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366),
        status: z.enum(["blocked"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const opId = await resolveOperatorId(supabase, userId);
    const rows = data.dates.map((d) => ({
      host_id: opId,
      date: d,
      status: data.status,
    }));
    const { error } = await supabase
      .from("host_availability")
      .upsert(rows, { onConflict: "host_id,date", ignoreDuplicates: false });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const clearMyHostAvailability = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        dates: z.array(z.string().regex(/^\d{4}-\d{2}-\d{2}$/)).min(1).max(366),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const opId = await resolveOperatorId(supabase, userId);
    const { error } = await supabase
      .from("host_availability")
      .delete()
      .eq("host_id", opId)
      .eq("status", "blocked") // never delete booked rows from this endpoint
      .in("date", data.dates);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const setAllTripsBookingType = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ booking_type: z.enum(["instant_book", "request_to_book"]) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const opId = await resolveOperatorId(supabase, userId);
    const { error } = await supabase
      .from("trip_packages")
      .update({ booking_type: data.booking_type } as any)
      .eq("operator_id", opId);
    if (error) throw new Error(error.message);
    // Keep operators.booking_type in sync so search cards reflect the choice.
    const operatorBookingType =
      data.booking_type === "instant_book" ? "instant" : "inquiry";
    const { error: opErr } = await supabase
      .from("operators")
      .update({ booking_type: operatorBookingType } as any)
      .eq("id", opId);
    if (opErr) throw new Error(opErr.message);
    return { ok: true };
  });

// Public: read availability for any host (used by the Check Dates date picker).
export const getPublicHostAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ host_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }): Promise<HostAvailabilityRow[]> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data: rows, error } = await client
      .from("host_availability")
      .select("date, status")
      .eq("host_id", data.host_id);
    if (error) throw new Error(error.message);
    return (rows ?? []).map((r: any) => ({ date: r.date, status: r.status }));
  });

export interface TripDateAvailability {
  charter_type: TripType;
  seats_available: number | null;
  max_party_size: number | null;
  bookedByDate: Record<string, number>;
  blockedDates: string[];
}

// Public: combined trip + per-date seat availability for the booking calendar.
export const getTripDateAvailability = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z
      .object({
        trip_id: z.string().uuid(),
        host_id: z.string().uuid(),
      })
      .parse(input),
  )
  .handler(async ({ data }): Promise<TripDateAvailability> => {
    const url = process.env.SUPABASE_URL!;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY!;
    const client = createClient<Database>(url, key, {
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });

    const { data: trip, error: tripErr } = await client
      .from("trip_packages")
      .select("charter_type, seats_available, max_party_size")
      .eq("id", data.trip_id)
      .maybeSingle();
    if (tripErr) throw new Error(tripErr.message);

    const { data: avail, error: availErr } = await client
      .from("host_availability")
      .select("date, status")
      .eq("host_id", data.host_id);
    if (availErr) throw new Error(availErr.message);

    const blockedDates = (avail ?? []).map((r: any) => r.date as string);
    const charter_type =
      ((trip as any)?.charter_type as TripType | null) ?? "private_charter";
    const seats_available = (trip as any)?.seats_available ?? null;
    const max_party_size = (trip as any)?.max_party_size ?? null;

    const bookedByDate: Record<string, number> = {};
    if (isSharedTripType(charter_type)) {
      const { data: counts, error: cntErr } = await client.rpc(
        "trip_seats_booked_by_date" as any,
        { _trip_id: data.trip_id },
      );
      if (cntErr) throw new Error(cntErr.message);
      for (const row of (counts ?? []) as any[]) {
        bookedByDate[row.trip_date as string] = Number(row.seats_booked ?? 0);
      }
    }

    return {
      charter_type,
      seats_available,
      max_party_size,
      bookedByDate,
      blockedDates,
    };
  });
