-- Add guests count to bookings for shared-tour seat tracking
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS guests integer NOT NULL DEFAULT 1 CHECK (guests >= 1);

-- Public aggregate RPC: seats booked per date for a given trip
CREATE OR REPLACE FUNCTION public.trip_seats_booked_by_date(_trip_id uuid)
RETURNS TABLE(trip_date date, seats_booked integer)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.trip_date, SUM(b.guests)::int AS seats_booked
  FROM public.bookings b
  WHERE b.course_id = _trip_id
    AND b.trip_date IS NOT NULL
    AND b.status IN ('confirmed', 'pending_payment')
  GROUP BY b.trip_date;
$$;

GRANT EXECUTE ON FUNCTION public.trip_seats_booked_by_date(uuid) TO anon, authenticated;