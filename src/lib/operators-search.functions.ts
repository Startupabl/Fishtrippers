import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";

export type OperatorCardDTO = {
  id: string;
  slug: string | null;
  display_name: string;
  city: string | null;
  state: string | null;
  country: string | null;
  cover_image_url: string | null;
  vessel_length_ft: number | null;
  vessel_capacity: number | null;
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
  category: z.string().optional().nullable(), // fishing_environment id (e.g. "inshore")
  instantBook: z.boolean().optional().nullable(),
  limit: z.number().int().min(1).max(60).optional().nullable(),
  featuredOnly: z.boolean().optional().nullable(),
});

function formatPrice(minor: number, currency: string): string {
  const major = minor / 100;
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      maximumFractionDigits: major % 1 === 0 ? 0 : 2,
    }).format(major);
    // Intl returns "$200.00" for USD; prefix region tag like "US"
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


    let query = supabase
      .from("operators")
      .select(
        `
        id, slug, display_name,
        default_departure_city, default_departure_state, default_departure_country,
        cover_image_url, booking_type, fishing_environments, featured, priority_order, created_at,
        vessels ( length_ft, max_passenger_capacity, boat_type_id, boat_types ( icon_url, subcategory_name ) ),
        trip_packages ( price_minor, currency, status )
      `,
      )
      .eq("moderation_status", "approved")
      .eq("status", "published");

    if (data.featuredOnly) query = query.eq("featured", true);
    if (data.q && data.q.trim()) query = query.ilike("display_name", `%${data.q.trim()}%`);
    if (data.city && data.city.trim())
      query = query.ilike("default_departure_city", `%${data.city.trim()}%`);
    if (data.category && data.category.trim())
      query = query.contains("fishing_environments", [data.category.trim()]);
    if (data.instantBook) query = query.eq("booking_type", "instant");

    query = query
      .order("featured", { ascending: false })
      .order("priority_order", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(data.limit ?? 30);

    const { data: rows, error } = await query;
    if (error) throw error;

    const items: OperatorCardDTO[] = (rows ?? []).map((row: any) => {
      const vessel = Array.isArray(row.vessels) ? row.vessels[0] : row.vessels;
      const trips: Array<{ price_minor: number; currency: string; status: string }> =
        row.trip_packages ?? [];
      // prefer active trips, fall back to draft so newly approved listings still surface a price
      const active = trips.filter((t) => t.status === "active");
      const candidates = active.length > 0 ? active : trips;
      let cheapest: { price_minor: number; currency: string } | null = null;
      for (const t of candidates) {
        if (!cheapest || t.price_minor < cheapest.price_minor) {
          cheapest = { price_minor: t.price_minor, currency: t.currency };
        }
      }

      const boatType = vessel?.boat_types
        ? Array.isArray(vessel.boat_types)
          ? vessel.boat_types[0]
          : vessel.boat_types
        : null;
      return {
        id: row.id,
        slug: row.slug ?? null,
        display_name: row.display_name ?? "Untitled listing",
        city: row.default_departure_city ?? null,
        state: row.default_departure_state ?? null,
        country: row.default_departure_country ?? null,
        cover_image_url: row.cover_image_url ?? null,
        vessel_length_ft: vessel?.length_ft != null ? Number(vessel.length_ft) : null,
        vessel_capacity: vessel?.max_passenger_capacity ?? null,
        boat_type_icon_url: boatType?.icon_url ?? null,
        boat_type_name: boatType?.subcategory_name ?? null,
        booking_type: row.booking_type ?? null,
        fishing_environments: row.fishing_environments ?? [],
        primary_environment:
          (row.fishing_environments && row.fishing_environments[0]) ?? null,
        verified: true,
        rating: null,
        review_count: null,
        lowest_price_label: cheapest
          ? formatPrice(cheapest.price_minor, cheapest.currency)
          : null,
        trip_count: active.length > 0 ? active.length : trips.length,
      };
    });

    return { items };
  });
