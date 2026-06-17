
-- Rename enum values for footer categories
ALTER TYPE public.site_page_category RENAME VALUE 'learning_teaching' TO 'explore';
ALTER TYPE public.site_page_category RENAME VALUE 'support_safety' TO 'resources';

-- Seed 9 footer pages (idempotent on slug)
INSERT INTO public.site_pages (slug, title, category, order_priority, is_external, external_url, status, description, content_html) VALUES
  ('about',                  'About Fishtrippers',            'explore',   10, false, NULL, 'live', 'About Fishtrippers', NULL),
  ('create-listing',         'Create a Listing',              'explore',   20, false, NULL, 'live', 'List your fishing trip on Fishtrippers', NULL),
  ('search',                 'Search for Trips',              'explore',   30, false, NULL, 'live', 'Find your next fishing trip', NULL),
  ('how-it-works-trippers',  'How it Works for Trippers',     'resources', 10, false, NULL, 'live', 'How Fishtrippers works for anglers', NULL),
  ('how-it-works-hosts',     'How it Works for Hosts',        'resources', 20, false, NULL, 'live', 'How Fishtrippers works for hosts', NULL),
  ('contact',                'Contact Us',                    'resources', 30, false, NULL, 'live', 'Get in touch with Fishtrippers', NULL),
  ('terms',                  'Terms of Service',              'legal',     10, false, NULL, 'live', 'Fishtrippers Terms of Service', NULL),
  ('privacy',                'Privacy Policy',                'legal',     20, false, NULL, 'live', 'Fishtrippers Privacy Policy', NULL),
  ('cancellation-policy',    'Pricing & Cancellation Policy', 'legal',     30, false, NULL, 'live', 'Pricing and cancellation policy', NULL)
ON CONFLICT (slug) DO NOTHING;
