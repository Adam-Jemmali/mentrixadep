-- Production hardening pass:
-- 1) Prevent metadata-based admin self-promotion during signup.
-- 2) Pin search_path for SECURITY DEFINER functions defined in earlier migrations.

-- ---------------------------------------------------------------------------
-- 1) Harden signup trigger function (keep referral attribution behavior)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user_with_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
  is_approved BOOLEAN;
  auto_reg BOOLEAN;
  norm_email TEXT;
  ref_code TEXT;
  referrer_uuid UUID;
  ref_email TEXT;
  new_email TEXT;
BEGIN
  user_role := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));

  -- Never trust client metadata for admin role assignment.
  IF user_role NOT IN ('student', 'tutor') THEN
    user_role := 'student';
  END IF;

  auto_reg := is_auto_approve_registrations();
  is_approved := auto_reg;

  INSERT INTO public.users (id, role, approved)
  VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
  WHERE id = NEW.id;

  norm_email := NULLIF(trim(COALESCE(NEW.email, '')), '');

  IF norm_email IS NOT NULL THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (
      norm_email,
      user_role,
      CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
    )
    ON CONFLICT (email) DO UPDATE SET
      role = EXCLUDED.role,
      status = EXCLUDED.status,
      updated_at = NOW();
  END IF;

  -- Referral: 8-char code in user metadata (email/password signup)
  ref_code := upper(regexp_replace(trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')), '[^A-Z0-9]', '', 'g'));
  IF length(ref_code) = 8 THEN
    SELECT u.id INTO referrer_uuid
    FROM public.users u
    WHERE u.referral_code = ref_code
    LIMIT 1;

    IF referrer_uuid IS NOT NULL AND referrer_uuid IS DISTINCT FROM NEW.id THEN
      SELECT email INTO ref_email FROM auth.users WHERE id = referrer_uuid;
      SELECT email INTO new_email FROM auth.users WHERE id = NEW.id;
      IF ref_email IS NOT NULL AND new_email IS NOT NULL THEN
        IF lower(split_part(ref_email, '@', 2)) IS DISTINCT FROM lower(split_part(new_email, '@', 2)) THEN
          UPDATE public.users
          SET referred_by = referrer_uuid
          WHERE id = NEW.id;
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ---------------------------------------------------------------------------
-- 2) Pin search_path for legacy SECURITY DEFINER functions
-- ---------------------------------------------------------------------------
ALTER FUNCTION public.is_approved_tutor(UUID) SET search_path = public;
ALTER FUNCTION public.is_approved_student(UUID) SET search_path = public;
ALTER FUNCTION public.is_admin(UUID) SET search_path = public;
ALTER FUNCTION public.update_user_jwt_metadata() SET search_path = public;
ALTER FUNCTION public.auto_complete_sessions() SET search_path = public;
ALTER FUNCTION public.handle_auto_approve_session_request() SET search_path = public;
ALTER FUNCTION public.validate_rating_session() SET search_path = public;
ALTER FUNCTION public.seed_admin_user(UUID) SET search_path = public;
ALTER FUNCTION public.is_auto_approve_registrations() SET search_path = public;
ALTER FUNCTION public.create_user_verification(UUID, TEXT) SET search_path = public;
