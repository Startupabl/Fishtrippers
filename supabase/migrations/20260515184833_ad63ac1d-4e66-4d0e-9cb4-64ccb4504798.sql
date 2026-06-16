-- Site Pages CMS table
CREATE TYPE public.site_page_category AS ENUM ('learning_teaching', 'support_safety', 'legal');
CREATE TYPE public.site_page_status AS ENUM ('live', 'draft');

CREATE TABLE public.site_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  category public.site_page_category NOT NULL,
  order_priority INTEGER NOT NULL DEFAULT 100,
  is_external BOOLEAN NOT NULL DEFAULT false,
  external_url TEXT,
  status public.site_page_status NOT NULL DEFAULT 'draft',
  description TEXT,
  content_html TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT site_pages_external_url_required CHECK (
    (is_external = false) OR (is_external = true AND external_url IS NOT NULL AND length(external_url) > 0)
  )
);

CREATE INDEX idx_site_pages_category_priority ON public.site_pages (category, order_priority);
CREATE INDEX idx_site_pages_status ON public.site_pages (status);

ALTER TABLE public.site_pages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Live pages public read"
  ON public.site_pages FOR SELECT
  TO anon, authenticated
  USING (status = 'live');

CREATE POLICY "Admins read all pages"
  ON public.site_pages FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins insert pages"
  ON public.site_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update pages"
  ON public.site_pages FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete pages"
  ON public.site_pages FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_site_pages_updated_at
  BEFORE UPDATE ON public.site_pages
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed initial pages from existing INFO_PAGES content
INSERT INTO public.site_pages (slug, title, category, order_priority, status, description, content_html) VALUES
  ('how-it-works', 'How it Works', 'learning_teaching', 1, 'live',
   'How FishTrippers connects you with human Aides through structured Courses, live sessions, and Refuel add-ons.',
   '<p>Stop stumbling through complex tools and expensive, impersonal tutorials. At FishTrippers, we believe the fastest way to master a new skill is through a direct, human connection.</p><h2>The Course</h2><p>Forget generic video bundles. Our Aides design structured, one-on-one experiences called Courses.</p><h2>Connect &amp; Create</h2><p>Once you book a Course, you work one-on-one with your Aide in live, online sessions.</p>'),
  ('learner-faqs', 'Learner FAQs', 'learning_teaching', 2, 'live',
   'Answers to common questions from learners on FishTrippers.',
   '<p>Our full Learner FAQ is coming soon. In the meantime, contact support and we''ll get right back to you.</p>'),
  ('mentor-faqs', 'Aide FAQs', 'learning_teaching', 3, 'live',
   'Answers to common questions from Aides on FishTrippers.',
   '<p>Our full Aide FAQ is coming soon. Reach out anytime — we love hearing from our Aides.</p>'),
  ('first-lesson-guide', 'First Lesson Guide', 'learning_teaching', 4, 'live',
   'What to expect from your very first lesson on FishTrippers.',
   '<p>A friendly first-lesson guide is coming soon. Show up curious — your Aide will take care of the rest.</p>'),
  ('become-a-mentor', 'Become an Aide', 'learning_teaching', 5, 'live',
   'Share your AI know-how, build a Course, and start earning on FishTrippers.',
   '<p>Full Aide onboarding details are coming soon. Ready now? List your first Course from the Aide dashboard.</p>'),

  ('about-us', 'About FishTrippers', 'support_safety', 1, 'live',
   'All the juice, none of the seeds. Why FishTrippers exists and how our human Aides help creators master AI.',
   '<p>In an era of AI noise, FishTrippers is the filter. We believe that mastering the world''s most powerful creative tools shouldn''t be a bitter struggle — it should be a refreshing transformation.</p>'),
  ('contact', 'Contact Support', 'support_safety', 2, 'live',
   'Get in touch with the FishTrippers team.',
   '<p>A full contact form is coming soon. For now, email us at hello@FishTrippers and we''ll respond within one business day.</p>'),
  ('trust-and-safety', 'Trust & Safety', 'support_safety', 3, 'live',
   'How we keep FishTrippers a safe place to learn and teach.',
   '<p>Detailed Trust &amp; Safety guidelines are coming soon. If you ever feel unsafe, contact support immediately.</p>'),
  ('data-handling', 'Data & Security', 'support_safety', 4, 'live',
   'How FishTrippers stores, processes, and protects your data.',
   '<p>Our full data handling overview is coming soon. We collect only what''s needed to deliver Aide-ship and never sell your data.</p>'),

  ('privacy-policy', 'Privacy Policy', 'legal', 1, 'live',
   'How FishTrippers collects, uses, and protects your information.',
   '<p>In this early version of FishTrippers, we only collect the information necessary to create your account and match you with an Aide. We do not sell your data to third parties.</p>'),
  ('terms-of-service', 'Terms of Service', 'legal', 2, 'live',
   'The rules that govern your use of FishTrippers.',
   '<p>FishTrippers is a place for respectful learning. We expect all Aides and learners to treat each other with patience and kindness.</p>'),
  ('mentor-agreement', 'Aide Agreement', 'legal', 3, 'live',
   'Terms that apply to Aides offering Courses on FishTrippers.',
   '<p>The full Aide Agreement is coming soon. In the meantime, Aides agree to offer guidance with patience, kindness, and honesty.</p>'),
  ('acceptable-use-policy', 'Acceptable Use Policy', 'legal', 4, 'live',
   'What you can and can''t do on FishTrippers.',
   '<p>The full Acceptable Use Policy is coming soon. Be respectful, stay on-topic, and don''t misuse the platform.</p>');