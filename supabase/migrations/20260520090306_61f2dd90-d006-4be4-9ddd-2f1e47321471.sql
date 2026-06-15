CREATE OR REPLACE FUNCTION public.list_unknown_tags()
 RETURNS TABLE(name text, usage_count integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  RETURN QUERY
  WITH journey_tags AS (
    SELECT lower(trim(t)) AS norm, t AS original
    FROM public.journeys j, unnest(j.tags) AS t
    WHERE t IS NOT NULL AND length(trim(t)) > 0
  ),
  known AS (
    SELECT lower(tg.name) AS norm FROM public.tags tg
  ),
  grouped AS (
    SELECT
      (array_agg(jt.original ORDER BY jt.original))[1]::text AS out_name,
      count(*)::int AS out_count
    FROM journey_tags jt
    WHERE jt.norm NOT IN (SELECT norm FROM known)
    GROUP BY jt.norm
  )
  SELECT g.out_name, g.out_count
  FROM grouped g
  ORDER BY g.out_count DESC, g.out_name ASC;
END;
$function$;