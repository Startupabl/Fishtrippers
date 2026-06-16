
CREATE TABLE public.boat_types (
  id text PRIMARY KEY,
  category_group text NOT NULL,
  subcategory_name text NOT NULL,
  icon_url text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.boat_types TO anon, authenticated;
GRANT ALL ON public.boat_types TO service_role;

ALTER TABLE public.boat_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read boat types"
  ON public.boat_types FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins manage boat types"
  ON public.boat_types FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::public.app_role));

CREATE TRIGGER boat_types_updated_at
  BEFORE UPDATE ON public.boat_types
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.boat_types (id, category_group, subcategory_name, sort_order) VALUES
  ('center_console',     'Center Console Boats', 'Center Console',       10),
  ('bay_boat',           'Center Console Boats', 'Bay Boat',             11),
  ('panga',              'Center Console Boats', 'Panga',                12),
  ('sports_fishing',     'Sports Fishing Boats', 'Sports Fishing',       20),
  ('convertible',        'Sports Fishing Boats', 'Convertible',          21),
  ('aluminum_fishing',   'Skiffs & Flat Boats',  'Aluminum Fishing',     30),
  ('flat_boats',         'Skiffs & Flat Boats',  'Flat Boats',           31),
  ('skiff',              'Skiffs & Flat Boats',  'Skiff',                32),
  ('bass_boat',          'Skiffs & Flat Boats',  'Bass Boat',            33),
  ('john_boat',          'Skiffs & Flat Boats',  'John Boat',            34),
  ('inflatable_onboard', 'Skiffs & Flat Boats',  'Inflatable Onboard',   35),
  ('walkaround',         'Cabin Cruisers',       'Walkaround',           40),
  ('pilot_house',        'Cabin Cruisers',       'Pilot House',          41),
  ('cuddy_cabin',        'Cabin Cruisers',       'Cuddy Cabin',          42),
  ('downeast',           'Cabin Cruisers',       'Downeast',             43),
  ('cruiser',            'Yachts',               'Cruiser',              50),
  ('motor_yacht',        'Yachts',               'Motor Yacht',          51),
  ('headboat',           'Headboats',            'Headboat',             60),
  ('catamaran',          'Catamarans',           'Catamaran',            70),
  ('dual_console',       'Speed Boats',          'Dual Console',         80),
  ('deckboat',           'Speed Boats',          'Deckboat',             81),
  ('jet_boat',           'Speed Boats',          'Jet Boat',             82),
  ('runabout',           'Speed Boats',          'Runabout',             83),
  ('driftboat',          'Unpowered Boats',      'Driftboat',            90),
  ('kayak_boat',         'Unpowered Boats',      'Kayak Boat',           91),
  ('canoe',              'Unpowered Boats',      'Canoe',                92),
  ('pontoon',            'Other',                'Pontoon',             100),
  ('airboat',            'Other',                'Airboat',             101),
  ('sailing',            'Other',                'Sailing',             102),
  ('other',              'Other',                'Other',               103);

ALTER TABLE public.vessels
  ADD COLUMN boat_type_id text REFERENCES public.boat_types(id) ON DELETE SET NULL,
  ADD COLUMN restored boolean NOT NULL DEFAULT false,
  ADD COLUMN num_engines int,
  ADD COLUMN horsepower_per_engine int,
  ADD COLUMN max_cruising_speed_knots numeric;
