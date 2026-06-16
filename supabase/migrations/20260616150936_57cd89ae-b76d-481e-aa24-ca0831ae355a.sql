
CREATE TABLE public.operator_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  operator_id uuid NOT NULL REFERENCES public.operators(id) ON DELETE CASCADE,
  position int NOT NULL DEFAULT 0,
  is_cover boolean NOT NULL DEFAULT false,
  storage_path text NOT NULL,
  hero_url text NOT NULL,
  gallery_url text NOT NULL,
  thumb_url text NOT NULL,
  width int,
  height int,
  bytes int,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.operator_photos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.operator_photos TO authenticated;
GRANT ALL ON public.operator_photos TO service_role;

ALTER TABLE public.operator_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Operator photos are public"
  ON public.operator_photos FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Owners insert their operator photos"
  ON public.operator_photos FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.id = operator_photos.operator_id AND o.owner_id = auth.uid()
  ));

CREATE POLICY "Owners update their operator photos"
  ON public.operator_photos FOR UPDATE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.id = operator_photos.operator_id AND o.owner_id = auth.uid()
  ));

CREATE POLICY "Owners delete their operator photos"
  ON public.operator_photos FOR DELETE
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.operators o
    WHERE o.id = operator_photos.operator_id AND o.owner_id = auth.uid()
  ));

CREATE INDEX idx_operator_photos_operator ON public.operator_photos(operator_id, position);
CREATE UNIQUE INDEX uniq_operator_photos_one_cover
  ON public.operator_photos(operator_id) WHERE is_cover = true;

-- Cap 15 photos per operator
CREATE OR REPLACE FUNCTION public.enforce_operator_photo_cap()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE c int;
BEGIN
  SELECT count(*) INTO c FROM public.operator_photos WHERE operator_id = NEW.operator_id;
  IF c >= 15 THEN
    RAISE EXCEPTION 'Maximum of 15 photos per listing reached';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_enforce_operator_photo_cap
  BEFORE INSERT ON public.operator_photos
  FOR EACH ROW EXECUTE FUNCTION public.enforce_operator_photo_cap();

-- Sync cover_image_url on the operators table
CREATE OR REPLACE FUNCTION public.sync_operator_cover()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_op uuid;
  new_cover text;
BEGIN
  target_op := COALESCE(NEW.operator_id, OLD.operator_id);

  SELECT thumb_url INTO new_cover
  FROM public.operator_photos
  WHERE operator_id = target_op AND is_cover = true
  LIMIT 1;

  IF new_cover IS NULL THEN
    SELECT thumb_url INTO new_cover
    FROM public.operator_photos
    WHERE operator_id = target_op
    ORDER BY position ASC, created_at ASC
    LIMIT 1;
  END IF;

  UPDATE public.operators SET cover_image_url = new_cover WHERE id = target_op;
  RETURN NULL;
END;
$$;

CREATE TRIGGER trg_sync_operator_cover
  AFTER INSERT OR UPDATE OR DELETE ON public.operator_photos
  FOR EACH ROW EXECUTE FUNCTION public.sync_operator_cover();
