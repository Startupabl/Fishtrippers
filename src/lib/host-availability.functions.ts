import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

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
