-- Categories table for hierarchical, admin-managed taxonomy
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  slug text NOT NULL UNIQUE,
  parent_id uuid NULL REFERENCES public.categories(id) ON DELETE CASCADE,
  image_url text NULL,
  is_featured boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_categories_parent_sort ON public.categories(parent_id, sort_order);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Categories public read"
  ON public.categories FOR SELECT
  TO anon, authenticated
  USING (true);

-- Admin write
CREATE POLICY "Admins insert categories"
  ON public.categories FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins update categories"
  ON public.categories FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins delete categories"
  ON public.categories FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- updated_at trigger
CREATE TRIGGER categories_set_updated_at
  BEFORE UPDATE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed the 6 core categories (featured, image_url left NULL so frontend
-- falls back to the existing in-bundle SVG placeholder per category name
-- — graphics are unchanged).
INSERT INTO public.categories (name, slug, is_featured, sort_order) VALUES
  ('AI Basics',   'ai-basics',   true, 10),
  ('AI Art',      'ai-art',      true, 20),
  ('Design',      'design',      true, 30),
  ('AI Music',    'ai-music',    true, 40),
  ('AI for Work', 'ai-for-work', true, 50),
  ('AI for Life', 'ai-for-life', true, 60);
