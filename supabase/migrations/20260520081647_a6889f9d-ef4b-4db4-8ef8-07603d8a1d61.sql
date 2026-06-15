-- Tags table for Search & SEO admin
CREATE TABLE public.tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL,
  is_public boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT tags_category_check CHECK (category IN (
    'Audio & Music','Image & Design','Video & Animation','LLMs & Writing','Automation & Coding'
  ))
);

CREATE UNIQUE INDEX tags_name_lower_idx ON public.tags (lower(name));
CREATE INDEX tags_category_idx ON public.tags (category);

ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can read public tags"
  ON public.tags FOR SELECT
  TO anon, authenticated
  USING (is_public = true);

CREATE POLICY "Admins read all tags"
  ON public.tags FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins insert tags"
  ON public.tags FOR INSERT
  TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update tags"
  ON public.tags FOR UPDATE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete tags"
  ON public.tags FOR DELETE
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER update_tags_updated_at
  BEFORE UPDATE ON public.tags
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Atomic merge: rewrites journeys.tags arrays from duplicates -> master, deletes dup rows.
CREATE OR REPLACE FUNCTION public.merge_tags(_master_id uuid, _dup_ids uuid[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  master_name text;
  dup_names text[];
  affected int := 0;
  dup_name text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  SELECT name INTO master_name FROM public.tags WHERE id = _master_id;
  IF master_name IS NULL THEN
    RAISE EXCEPTION 'Master tag not found';
  END IF;

  SELECT array_agg(name) INTO dup_names FROM public.tags
    WHERE id = ANY(_dup_ids) AND id <> _master_id;

  IF dup_names IS NULL OR array_length(dup_names, 1) IS NULL THEN
    RETURN jsonb_build_object('affected_journeys', 0, 'merged_count', 0);
  END IF;

  FOREACH dup_name IN ARRAY dup_names LOOP
    WITH updated AS (
      UPDATE public.journeys
      SET tags = (
        SELECT array_agg(DISTINCT t)
        FROM unnest(
          array_append(array_remove(tags, dup_name), master_name)
        ) AS t
      )
      WHERE dup_name = ANY(tags)
      RETURNING 1
    )
    SELECT affected + count(*) INTO affected FROM updated;
  END LOOP;

  DELETE FROM public.tags WHERE id = ANY(_dup_ids) AND id <> _master_id;

  RETURN jsonb_build_object(
    'affected_journeys', affected,
    'merged_count', array_length(dup_names, 1)
  );
END;
$$;

-- Seed taxonomy
INSERT INTO public.tags (name, category) VALUES
  ('Suno AI','Audio & Music'),('Udio AI','Audio & Music'),('ElevenLabs','Audio & Music'),
  ('LALAL.AI','Audio & Music'),('Moises AI','Audio & Music'),('Landr','Audio & Music'),
  ('AI Music Composing','Audio & Music'),('AI Songwriting','Audio & Music'),
  ('Voice Cloning','Audio & Music'),('Vocal Synthesis','Audio & Music'),('AI Audio Production','Audio & Music'),

  ('Midjourney','Image & Design'),('Stable Diffusion','Image & Design'),('DALL-E 3','Image & Design'),
  ('Adobe Firefly','Image & Design'),('Leonardo.ai','Image & Design'),('v0 by Vercel','Image & Design'),
  ('Uizard','Image & Design'),('AI Art Generation','Image & Design'),('Graphic Design AI','Image & Design'),
  ('Prompt Engineering (Visual)','Image & Design'),('AI Inpainting','Image & Design'),('UI Design AI','Image & Design'),

  ('Sora AI','Video & Animation'),('Runway Gen-2','Video & Animation'),('Pika Labs','Video & Animation'),
  ('Luma Dream Machine','Video & Animation'),('Kling AI','Video & Animation'),('HeyGen','Video & Animation'),
  ('Synthesia','Video & Animation'),('Descript','Video & Animation'),('AI Video Creation','Video & Animation'),
  ('AI Animation','Video & Animation'),('AI Avatars','Video & Animation'),('Text-to-Video','Video & Animation'),
  ('AI Video Editing','Video & Animation'),

  ('ChatGPT','LLMs & Writing'),('Claude AI','LLMs & Writing'),('Gemini','LLMs & Writing'),
  ('Perplexity AI','LLMs & Writing'),('Llama','LLMs & Writing'),('Jasper AI','LLMs & Writing'),
  ('Copy.ai','LLMs & Writing'),('Notion AI','LLMs & Writing'),('AI Writing Tools','LLMs & Writing'),
  ('AI Copywriting','LLMs & Writing'),('Prompt Engineering (Text)','LLMs & Writing'),
  ('Content Automation','LLMs & Writing'),('Custom GPTs','LLMs & Writing'),

  ('GitHub Copilot','Automation & Coding'),('Cursor AI','Automation & Coding'),('Lovable.dev','Automation & Coding'),
  ('Replit Agent','Automation & Coding'),('Zapier AI','Automation & Coding'),('Make.com','Automation & Coding'),
  ('n8n','Automation & Coding'),('CrewAI','Automation & Coding'),('AI Automation','Automation & Coding'),
  ('AI Coding','Automation & Coding'),('AI Agents','Automation & Coding'),('No-Code AI Development','Automation & Coding');