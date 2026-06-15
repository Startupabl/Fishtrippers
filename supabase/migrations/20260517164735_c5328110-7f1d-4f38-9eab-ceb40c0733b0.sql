-- 1. Create public storage bucket for category images
INSERT INTO storage.buckets (id, name, public)
VALUES ('category-images', 'category-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Category images public read"
ON storage.objects FOR SELECT
USING (bucket_id = 'category-images');

CREATE POLICY "Admins upload category images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update category images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete category images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'category-images' AND public.has_role(auth.uid(), 'admin'));

-- 2. Seed sub-categories
DO $$
DECLARE
  parents JSONB := '[
    {"parent":"AI Basics","children":["ChatGPT & Claude 101","Prompt Engineering","AI Tools Overview"]},
    {"parent":"AI Art","children":["Midjourney Mastery","Stable Diffusion","Adobe Firefly"]},
    {"parent":"AI Design","children":["AI Web & UI Design","AI Presentation Design","Video Generation"]},
    {"parent":"AI Music","children":["Suno & Udio","AI Voice Cloning","AI Production"]},
    {"parent":"AI for Work","children":["Workflow Automation","AI Data Analysis","AI Marketing"]},
    {"parent":"AI for Life","children":["Personal Productivity","AI for Education","Health & Fitness"]}
  ]'::jsonb;
  entry JSONB;
  parent_uuid UUID;
  child_name TEXT;
  child_slug TEXT;
  idx INT;
BEGIN
  FOR entry IN SELECT * FROM jsonb_array_elements(parents) LOOP
    SELECT id INTO parent_uuid FROM public.categories
      WHERE name = entry->>'parent' AND parent_id IS NULL LIMIT 1;
    IF parent_uuid IS NULL THEN CONTINUE; END IF;
    idx := 0;
    FOR child_name IN SELECT jsonb_array_elements_text(entry->'children') LOOP
      idx := idx + 1;
      child_slug := regexp_replace(lower(child_name), '[^a-z0-9]+', '-', 'g');
      child_slug := regexp_replace(child_slug, '(^-+|-+$)', '', 'g');
      INSERT INTO public.categories (name, slug, parent_id, is_featured, sort_order)
      VALUES (child_name, child_slug, parent_uuid, false, idx * 10)
      ON CONFLICT (name) DO NOTHING;
    END LOOP;
  END LOOP;
END $$;