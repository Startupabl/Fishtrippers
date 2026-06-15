
CREATE TYPE public.user_status_t AS ENUM ('unverified', 'verified');
CREATE TYPE public.app_role AS ENUM ('mentor', 'learner', 'admin');
CREATE TYPE public.journey_status AS ENUM ('draft', 'published', 'archived');
CREATE TYPE public.order_status_t AS ENUM ('active', 'completed', 'refunded');
CREATE TYPE public.attachment_type_t AS ENUM ('none', 'custom_offer');
CREATE TYPE public.offer_status_t AS ENUM ('pending', 'accepted', 'declined');

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

-- profiles
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  first_name TEXT, last_name TEXT, email TEXT, phone_number TEXT,
  address_line1 TEXT, city TEXT, state_region TEXT, zip_code TEXT,
  country TEXT, timezone TEXT,
  user_status public.user_status_t NOT NULL DEFAULT 'unverified',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles viewable by owner" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles updatable by owner" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id);
CREATE POLICY "Profiles insertable by owner" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- user_roles + has_role
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role public.app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role);
$$;

CREATE POLICY "Roles viewable by owner" ON public.user_roles FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- New-user handler
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name)
  VALUES (NEW.id, NEW.email,
    NEW.raw_user_meta_data ->> 'first_name',
    NEW.raw_user_meta_data ->> 'last_name');
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'learner') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Forbidden keyword check
CREATE OR REPLACE FUNCTION public.contains_forbidden_keyword(_input TEXT)
RETURNS BOOLEAN LANGUAGE plpgsql IMMUTABLE SET search_path = public AS $$
DECLARE
  decoded TEXT;
  partial_roots TEXT[] := ARRAY['porn','porno','xxx','nsfw','hentai','incest','rape','pedo','cocaine','heroin','fentanyl','meth','lsd','mdma','ecstasy','marijuana','cannabis','ketamine','nazi','kkk','suicid','selfharm','nigg','tranny','retard'];
  exact_words TEXT[] := ARRAY['sex','naked','nude','nudes','nudity','erotic','erotica','fetish','camgirl','onlyfans','playboy','hardcore','milf','escort','sensual','bdsm','kill','murder','bomb','weapon','weapons','racist','slaughter','suicide','torture','blood','gore','terror','hitler','jihad','behead','lynch','whitepower','crypto','bitcoin','giveaway','freemoney','hacked','pirated','pharmacy','pills','steroids','viagra','xanax','torrent','darkweb','carding','ponzi','pyramidscheme','phishing','getrichquick','doubleyourmoney','fuck','shit','bitch','asshole','bastard','dick','cunt','slut','whore','fag','faggot'];
  root TEXT; word TEXT;
BEGIN
  IF _input IS NULL OR length(_input) = 0 THEN RETURN FALSE; END IF;
  decoded := replace(replace(replace(replace(replace(replace(replace(replace(replace(
    lower(_input),
    '0','o'),'1','i'),'3','e'),'4','a'),'5','s'),'7','t'),'@','a'),'$','s'),'!','i');
  FOREACH root IN ARRAY partial_roots LOOP
    IF position(root IN decoded) > 0 THEN RETURN TRUE; END IF;
  END LOOP;
  FOREACH word IN ARRAY exact_words LOOP
    IF decoded ~ ('(^|[^a-z0-9])' || word || '([^a-z0-9]|$)') THEN RETURN TRUE; END IF;
  END LOOP;
  RETURN FALSE;
END;
$$;

-- journeys (search_vector populated by trigger to satisfy IMMUTABLE constraint)
CREATE TABLE public.journeys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  subcategory TEXT,
  description TEXT NOT NULL,
  mentor_bio TEXT,
  cover_image_url TEXT,
  base_price_minor INTEGER NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  session_count INTEGER NOT NULL DEFAULT 1,
  extra_session_price_minor INTEGER NOT NULL DEFAULT 6000,
  tags TEXT[] NOT NULL DEFAULT '{}',
  status public.journey_status NOT NULL DEFAULT 'draft',
  search_vector tsvector,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT tags_max_10 CHECK (array_length(tags, 1) IS NULL OR array_length(tags, 1) <= 10)
);
CREATE INDEX journeys_search_vec_idx ON public.journeys USING GIN (search_vector);
CREATE INDEX journeys_tags_idx ON public.journeys USING GIN (tags);
CREATE INDEX journeys_mentor_idx ON public.journeys (mentor_id);
CREATE INDEX journeys_status_idx ON public.journeys (status);

ALTER TABLE public.journeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Published journeys public read" ON public.journeys FOR SELECT USING (status = 'published');
CREATE POLICY "Mentors read own journeys" ON public.journeys FOR SELECT TO authenticated USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors insert own journeys" ON public.journeys FOR INSERT TO authenticated WITH CHECK (auth.uid() = mentor_id);
CREATE POLICY "Mentors update own journeys" ON public.journeys FOR UPDATE TO authenticated USING (auth.uid() = mentor_id);
CREATE POLICY "Mentors delete own journeys" ON public.journeys FOR DELETE TO authenticated USING (auth.uid() = mentor_id);

CREATE TRIGGER journeys_set_updated_at BEFORE UPDATE ON public.journeys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.journeys_refresh_search_vector()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.title, '')), 'A') ||
    setweight(to_tsvector('english', array_to_string(coalesce(NEW.tags, '{}'), ' ')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.category, '') || ' ' || coalesce(NEW.subcategory, '')), 'C');
  RETURN NEW;
END;
$$;
CREATE TRIGGER journeys_search_vector_trg BEFORE INSERT OR UPDATE ON public.journeys FOR EACH ROW EXECUTE FUNCTION public.journeys_refresh_search_vector();

CREATE OR REPLACE FUNCTION public.validate_journey_content()
RETURNS TRIGGER LANGUAGE plpgsql SET search_path = public AS $$
DECLARE t TEXT;
BEGIN
  IF public.contains_forbidden_keyword(NEW.title) THEN
    RAISE EXCEPTION 'Content violates community safety standards (title)';
  END IF;
  IF public.contains_forbidden_keyword(NEW.description) THEN
    RAISE EXCEPTION 'Content violates community safety standards (description)';
  END IF;
  IF NEW.tags IS NOT NULL THEN
    FOREACH t IN ARRAY NEW.tags LOOP
      IF public.contains_forbidden_keyword(t) THEN
        RAISE EXCEPTION 'Content violates community safety standards (tag)';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER journeys_validate_content BEFORE INSERT OR UPDATE ON public.journeys FOR EACH ROW EXECUTE FUNCTION public.validate_journey_content();

-- orders
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id UUID NOT NULL REFERENCES public.journeys(id) ON DELETE RESTRICT,
  total_paid_minor INTEGER NOT NULL,
  currency TEXT NOT NULL DEFAULT 'USD',
  sessions_remaining INTEGER NOT NULL,
  order_status public.order_status_t NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX orders_learner_idx ON public.orders (learner_id);
CREATE INDEX orders_mentor_idx ON public.orders (mentor_id);
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Learner reads own orders" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = learner_id);
CREATE POLICY "Mentor reads orders against own journeys" ON public.orders FOR SELECT TO authenticated USING (auth.uid() = mentor_id);
CREATE POLICY "Learner creates own orders" ON public.orders FOR INSERT TO authenticated WITH CHECK (auth.uid() = learner_id);
CREATE POLICY "Learner updates own orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = learner_id);
CREATE POLICY "Mentor updates orders" ON public.orders FOR UPDATE TO authenticated USING (auth.uid() = mentor_id);
CREATE TRIGGER orders_set_updated_at BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- threads + messages
CREATE TABLE public.message_threads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  learner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mentor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  journey_id UUID REFERENCES public.journeys(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (learner_id, mentor_id, journey_id)
);
ALTER TABLE public.message_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Participants read threads" ON public.message_threads FOR SELECT TO authenticated USING (auth.uid() = learner_id OR auth.uid() = mentor_id);
CREATE POLICY "Participants create threads" ON public.message_threads FOR INSERT TO authenticated WITH CHECK (auth.uid() = learner_id OR auth.uid() = mentor_id);
CREATE TRIGGER threads_set_updated_at BEFORE UPDATE ON public.message_threads FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id UUID NOT NULL REFERENCES public.message_threads(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  attachment_type public.attachment_type_t NOT NULL DEFAULT 'none',
  offer_sessions INTEGER,
  offer_price_minor INTEGER,
  offer_currency TEXT,
  offer_status public.offer_status_t,
  offer_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX messages_thread_idx ON public.messages (thread_id, created_at);
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages REPLICA IDENTITY FULL;

CREATE POLICY "Thread participants read messages" ON public.messages FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.message_threads t WHERE t.id = thread_id AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid()))
);
CREATE POLICY "Thread participants send messages" ON public.messages FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = sender_id AND EXISTS (SELECT 1 FROM public.message_threads t WHERE t.id = thread_id AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid()))
);
CREATE POLICY "Participants update offer status" ON public.messages FOR UPDATE TO authenticated USING (
  EXISTS (SELECT 1 FROM public.message_threads t WHERE t.id = thread_id AND (t.learner_id = auth.uid() OR t.mentor_id = auth.uid()))
);

ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_threads;
