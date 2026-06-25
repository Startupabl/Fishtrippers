GRANT SELECT ON public.profiles TO anon;

CREATE POLICY "Public can view operator owner profiles"
ON public.profiles
FOR SELECT
TO anon, authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.owner_id = profiles.id
      AND o.status = 'published'
      AND o.moderation_status = 'approved'
  )
);