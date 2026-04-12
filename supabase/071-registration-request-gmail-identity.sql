-- Gmail treats `team.innovatecast@gmail.com` and `teaminnovatecast@gmail.com` as the same inbox,
-- but they are different TEXT values. Waitlist lookups with plain `email = $1` miss the row when
-- Google OAuth returns a different dot pattern than `registration_requests.email`.

CREATE OR REPLACE FUNCTION public.identity_email_key(e text)
RETURNS text
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN e IS NULL OR btrim(e) = '' THEN ''
    WHEN position('@' IN btrim(e)) = 0 THEN lower(btrim(e))
    WHEN lower(split_part(btrim(e), '@', 2)) IN ('gmail.com', 'googlemail.com')
    THEN replace(split_part(lower(btrim(e)), '@', 1), '.', '') || '@' || lower(split_part(btrim(e), '@', 2))
    ELSE lower(btrim(e))
  END;
$$;

CREATE OR REPLACE FUNCTION public.registration_request_by_identity_email(p_email text)
RETURNS SETOF registration_requests
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT rr.*
  FROM public.registration_requests rr
  WHERE public.identity_email_key(rr.email) = public.identity_email_key(p_email)
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.registration_request_by_identity_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.registration_request_by_identity_email(text) TO service_role;

REVOKE ALL ON FUNCTION public.identity_email_key(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identity_email_key(text) TO service_role;
