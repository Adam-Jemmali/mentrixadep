-- Auto-approve onboarding, guide verification, and course proof (no manual admin queues).

UPDATE public.system_settings
   SET value = '{"enabled": true}'::jsonb,
       updated_at = NOW()
 WHERE key = 'auto_approve_registrations';

INSERT INTO public.system_settings (key, value)
VALUES ('auto_approve_registrations', '{"enabled": true}'::jsonb)
ON CONFLICT (key) DO NOTHING;

UPDATE public.registration_requests
   SET status = 'approved',
       updated_at = NOW()
 WHERE status = 'pending';

UPDATE public.user_verifications
   SET status = 'approved',
       reviewed_at = COALESCE(reviewed_at, NOW()),
       updated_at = NOW()
 WHERE status IN ('pending', 'in_review', 'info_requested');

UPDATE public.users u
   SET verification_status = 'approved'
 WHERE verification_status IN ('pending', 'in_review', 'info_requested')
   AND EXISTS (
     SELECT 1 FROM public.user_verifications v
      WHERE v.user_id = u.id AND v.status = 'approved'
   );

UPDATE public.tutor_courses
   SET verified = true
 WHERE verified = false;

CREATE OR REPLACE FUNCTION public.handle_new_user_with_jwt()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  user_role          TEXT;
  is_approved        BOOLEAN;
  auto_reg           BOOLEAN;
  norm_email         TEXT;
  existing_rr_status TEXT;
  existing_rr_role   TEXT;
  ref_code           TEXT;
  referrer_uuid      UUID;
  ref_email          TEXT;
  new_email          TEXT;
BEGIN
  user_role := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', 'student')));
  IF user_role = 'admin' THEN
    user_role := 'student';
  END IF;
  IF user_role NOT IN ('student', 'tutor') THEN
    user_role := 'student';
  END IF;

  auto_reg := public.is_auto_approve_registrations();
  is_approved := auto_reg;

  norm_email := lower(NULLIF(trim(COALESCE(NEW.email, '')), ''));

  IF norm_email IS NOT NULL THEN
    SELECT rr.status, rr.role
      INTO existing_rr_status, existing_rr_role
      FROM public.registration_requests rr
     WHERE lower(rr.email) = norm_email
     LIMIT 1;

    IF existing_rr_status = 'approved' THEN
      is_approved := true;
      IF existing_rr_role IN ('student', 'tutor') THEN
        user_role := existing_rr_role;
      END IF;
    END IF;
  END IF;

  INSERT INTO public.users (id, role, approved, status)
  VALUES (
    NEW.id,
    user_role,
    is_approved,
    CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
  )
  ON CONFLICT (id) DO NOTHING;

  UPDATE auth.users
     SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
   WHERE id = NEW.id;

  IF norm_email IS NOT NULL THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (
      norm_email,
      user_role,
      CASE WHEN is_approved THEN 'approved' ELSE 'pending' END
    )
    ON CONFLICT (email) DO UPDATE SET
      role = CASE
               WHEN registration_requests.status IN ('approved', 'rejected')
               THEN registration_requests.role
               ELSE EXCLUDED.role
             END,
      status = CASE
                 WHEN registration_requests.status IN ('approved', 'rejected')
                 THEN registration_requests.status
                 WHEN is_approved THEN 'approved'
                 ELSE EXCLUDED.status
               END,
      updated_at = NOW();
  END IF;

  ref_code := upper(regexp_replace(
    trim(COALESCE(NEW.raw_user_meta_data->>'referral_code', '')),
    '[^A-Z0-9]', '', 'g'
  ));
  IF length(ref_code) = 8 THEN
    SELECT u.id INTO referrer_uuid
      FROM public.users u
     WHERE u.referral_code = ref_code
     LIMIT 1;

    IF referrer_uuid IS NOT NULL AND referrer_uuid IS DISTINCT FROM NEW.id THEN
      SELECT email INTO ref_email FROM auth.users WHERE id = referrer_uuid;
      SELECT email INTO new_email FROM auth.users WHERE id = NEW.id;
      IF ref_email IS NOT NULL AND new_email IS NOT NULL THEN
        IF lower(split_part(ref_email, '@', 2)) IS DISTINCT FROM
           lower(split_part(new_email, '@', 2))
        THEN
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
