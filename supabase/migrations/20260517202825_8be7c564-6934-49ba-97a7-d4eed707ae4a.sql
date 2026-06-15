-- Make content moderation less prone to false positives and skip drafts.

CREATE OR REPLACE FUNCTION public.contains_forbidden_keyword(_input text)
RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $function$
DECLARE
  decoded TEXT;
  partial_roots TEXT[] := ARRAY[
    'porn','porno','xxx','nsfw','hentai','incest','pedo',
    'cocaine','heroin','fentanyl','lsd','mdma','ecstasy',
    'marijuana','cannabis','ketamine',
    'suicid','selfharm',
    'nigg','tranny','retard'
  ];
  exact_words TEXT[] := ARRAY[
    'sex','naked','nude','nudes','nudity','erotic','erotica','fetish',
    'camgirl','onlyfans','playboy','hardcore','milf','escort','sensual','bdsm',
    'kill','murder','bomb','weapon','weapons','nazi','racist','slaughter',
    'suicide','torture','gore','terror','hitler','jihad','behead','lynch',
    'kkk','whitepower','rape','raped','rapist',
    'crypto','bitcoin','giveaway','freemoney','hacked','pirated',
    'pharmacy','pills','steroids','viagra','xanax','torrent','darkweb',
    'carding','ponzi','pyramidscheme','phishing','getrichquick','doubleyourmoney',
    'fuck','shit','bitch','asshole','bastard','dick','cunt','slut','whore',
    'fag','faggot','meth'
  ];
  token TEXT;
  root TEXT;
  word TEXT;
  tokens TEXT[];
BEGIN
  IF _input IS NULL OR length(_input) = 0 THEN RETURN FALSE; END IF;

  decoded := replace(replace(replace(replace(replace(replace(replace(replace(replace(
    lower(_input),
    '0','o'),'1','i'),'3','e'),'4','a'),'5','s'),'7','t'),'@','a'),'$','s'),'!','i');

  -- Tokenize on non-alphanumeric characters and match per-token to avoid
  -- false positives like "grape" matching "rape" or "therapy" matching "rape".
  tokens := regexp_split_to_array(decoded, '[^a-z0-9]+');

  FOREACH token IN ARRAY tokens LOOP
    IF token IS NULL OR token = '' THEN CONTINUE; END IF;

    -- Exact whole-token match.
    FOREACH word IN ARRAY exact_words LOOP
      IF token = word THEN RETURN TRUE; END IF;
    END LOOP;

    -- Partial: only block when the token STARTS or ENDS with a high-risk root
    -- (catches "pornography", "suicidal", "pedophile" but ignores "therapeutic", "grape", "method").
    FOREACH root IN ARRAY partial_roots LOOP
      IF token LIKE root || '%' OR token LIKE '%' || root THEN
        RETURN TRUE;
      END IF;
    END LOOP;
  END LOOP;

  RETURN FALSE;
END;
$function$;

-- Only enforce the content check when the row is being published. Drafts are
-- still editable while the user is writing, and the publish/edit server
-- functions run the same check explicitly.
CREATE OR REPLACE FUNCTION public.validate_journey_content()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
DECLARE t TEXT;
BEGIN
  IF NEW.status <> 'published' THEN
    RETURN NEW;
  END IF;

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
$function$;