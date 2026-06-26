
CREATE TABLE public.currencies (
  code text PRIMARY KEY,
  name text NOT NULL,
  symbol text NOT NULL,
  flag text NOT NULL DEFAULT '',
  sort_order int NOT NULL DEFAULT 100,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.currencies TO anon, authenticated;
GRANT ALL ON public.currencies TO service_role;

ALTER TABLE public.currencies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Currencies are public read" ON public.currencies
  FOR SELECT TO anon, authenticated USING (true);

CREATE TRIGGER trg_currencies_updated_at
  BEFORE UPDATE ON public.currencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.currencies (code, name, symbol, flag, sort_order) VALUES
  ('USD','US Dollar','$','🇺🇸',10),
  ('EUR','Euro','€','🇪🇺',20),
  ('GBP','British Pound','£','🇬🇧',30),
  ('CAD','Canadian Dollar','$','🇨🇦',40),
  ('AUD','Australian Dollar','$','🇦🇺',50),
  ('MXN','Mexican Peso','$','🇲🇽',60),
  ('BRL','Brazilian Real','R$','🇧🇷',70),
  ('CRC','Costa Rican Colón','₡','🇨🇷',80),
  ('CHF','Swiss Franc','Fr','🇨🇭',90),
  ('NZD','New Zealand Dollar','$','🇳🇿',100),
  ('SGD','Singapore Dollar','$','🇸🇬',110),
  ('JPY','Japanese Yen','¥','🇯🇵',120),
  ('CNY','Chinese Yuan','¥','🇨🇳',130),
  ('THB','Thai Baht','฿','🇹🇭',140),
  ('PHP','Philippine Peso','₱','🇵🇭',150),
  ('IDR','Indonesian Rupiah','Rp','🇮🇩',160),
  ('MYR','Malaysian Ringgit','RM','🇲🇾',170);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS currency_preference text REFERENCES public.currencies(code) ON DELETE SET NULL;
