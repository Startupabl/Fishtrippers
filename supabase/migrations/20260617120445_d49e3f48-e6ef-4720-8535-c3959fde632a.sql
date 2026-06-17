-- Allow public (anon + authenticated) read access to approved+published operators
-- and their related vessels and trip packages, so the public /search page can
-- surface listings without requiring sign-in.

CREATE POLICY "Public read approved operators"
ON public.operators
FOR SELECT
TO anon
USING (moderation_status = 'approved' AND status = 'published');

CREATE POLICY "Public read vessels of approved operators"
ON public.vessels
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.id = vessels.operator_id
      AND o.moderation_status = 'approved'
      AND o.status = 'published'
  )
);

CREATE POLICY "Public read trip packages of approved operators"
ON public.trip_packages
FOR SELECT
TO anon
USING (
  EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.id = trip_packages.operator_id
      AND o.moderation_status = 'approved'
      AND o.status = 'published'
  )
);

-- Grant the Data API anon role explicit SELECT on these tables.
GRANT SELECT ON public.operators TO anon;
GRANT SELECT ON public.vessels TO anon;
GRANT SELECT ON public.trip_packages TO anon;