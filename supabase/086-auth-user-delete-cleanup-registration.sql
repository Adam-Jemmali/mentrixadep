-- When an auth user is deleted (Supabase dashboard or admin API), remove matching
-- registration_requests so admins do not see orphaned onboarding rows.

CREATE OR REPLACE FUNCTION public.delete_registration_requests_by_identity_email(p_email text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_email text;
BEGIN
  norm_email := lower(nullif(trim(coalesce(p_email, '')), ''));
  IF norm_email IS NULL OR norm_email = '' THEN
    RETURN;
  END IF;

  DELETE FROM public.registration_requests rr
  WHERE public.identity_email_key(rr.email) = public.identity_email_key(norm_email);
END;
$$;

REVOKE ALL ON FUNCTION public.delete_registration_requests_by_identity_email(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.delete_registration_requests_by_identity_email(text) TO service_role;

CREATE OR REPLACE FUNCTION public.handle_auth_user_deleted_cleanup()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.delete_registration_requests_by_identity_email(OLD.email);
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_deleted_cleanup ON auth.users;
CREATE TRIGGER on_auth_user_deleted_cleanup
  AFTER DELETE ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_auth_user_deleted_cleanup();
