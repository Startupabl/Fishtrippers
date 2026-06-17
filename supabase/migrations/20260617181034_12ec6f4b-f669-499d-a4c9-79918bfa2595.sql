
-- 1. Per-trip booking type
CREATE TYPE public.trip_booking_type AS ENUM ('instant_book', 'request_to_book');

ALTER TABLE public.trip_packages
  ADD COLUMN booking_type public.trip_booking_type NOT NULL DEFAULT 'request_to_book';

UPDATE public.trip_packages tp
SET booking_type = CASE
  WHEN o.booking_type = 'instant'::public.operator_booking_type THEN 'instant_book'::public.trip_booking_type
  ELSE 'request_to_book'::public.trip_booking_type
END
FROM public.operators o
WHERE tp.operator_id = o.id;

-- 2. bookings.trip_date
ALTER TABLE public.bookings
  ADD COLUMN trip_date date;

-- 3. host_availability table
CREATE TABLE public.host_availability (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  host_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  date date NOT NULL,
  status text NOT NULL CHECK (status IN ('booked','blocked')),
  booking_id uuid REFERENCES public.bookings(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (host_id, date)
);

CREATE INDEX idx_host_availability_host_date ON public.host_availability(host_id, date);

GRANT SELECT ON public.host_availability TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.host_availability TO authenticated;
GRANT ALL ON public.host_availability TO service_role;

ALTER TABLE public.host_availability ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read availability"
  ON public.host_availability FOR SELECT
  USING (true);

CREATE POLICY "Hosts can insert their own availability"
  ON public.host_availability FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = host_availability.host_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can update their own availability"
  ON public.host_availability FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = host_availability.host_id AND o.owner_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = host_availability.host_id AND o.owner_id = auth.uid()
    )
  );

CREATE POLICY "Hosts can delete their own availability"
  ON public.host_availability FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.operators o
      WHERE o.id = host_availability.host_id AND o.owner_id = auth.uid()
    )
  );

CREATE TRIGGER trg_host_availability_updated_at
  BEFORE UPDATE ON public.host_availability
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Trigger to auto-block date on confirmed booking
CREATE OR REPLACE FUNCTION public.sync_host_availability_from_booking()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_operator_id uuid;
BEGIN
  IF TG_OP = 'INSERT' OR (TG_OP = 'UPDATE' AND NEW.status IS DISTINCT FROM OLD.status) THEN
    IF NEW.status = 'confirmed' AND NEW.trip_date IS NOT NULL THEN
      SELECT operator_id INTO v_operator_id
      FROM public.trip_packages
      WHERE id = NEW.course_id
      LIMIT 1;

      IF v_operator_id IS NOT NULL THEN
        INSERT INTO public.host_availability (host_id, date, status, booking_id)
        VALUES (v_operator_id, NEW.trip_date, 'booked', NEW.id)
        ON CONFLICT (host_id, date) DO UPDATE
          SET status = 'booked', booking_id = EXCLUDED.booking_id, updated_at = now()
          WHERE public.host_availability.status <> 'booked'
             OR public.host_availability.booking_id IS NULL;
      END IF;
    ELSIF TG_OP = 'UPDATE' AND OLD.status = 'confirmed' AND NEW.status <> 'confirmed' THEN
      DELETE FROM public.host_availability
      WHERE booking_id = NEW.id AND status = 'booked';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_bookings_sync_host_availability
  AFTER INSERT OR UPDATE OF status ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.sync_host_availability_from_booking();
