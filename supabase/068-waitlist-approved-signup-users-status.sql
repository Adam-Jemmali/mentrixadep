-- 068: Signup trigger — align public.users with waitlist-approved registration_requests
-- (approved boolean + status text). Without this, INSERT only set approved/auto_reg and
-- left status at default 'pending' (058), so the app treated waitlist-approved signups as pending.
--
-- Also re-runs the repair from 059 for any historical rows.

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
  waitlist_rr_status TEXT;
  waitlist_rr_role TEXT;
  user_access_status TEXT;
  ref_code TEXT;
  referrer_uuid UUID;
  ref_email TEXT;
  new_email TEXT;
BEGIN
  user_role := lower(trim(COALESCE(NEW.raw_user_meta_data->>'role', '')));

  IF user_role NOT IN ('student', 'tutor') THEN
    user_role := 'student';
  END IF;

  auto_reg := is_auto_approve_registrations();
  is_approved := auto_reg;

  norm_email := NULLIF(trim(COALESCE(NEW.email, '')), '');

  IF norm_email IS NOT NULL THEN
    SELECT rr.status, rr.role INTO waitlist_rr_status, waitlist_rr_role
    FROM registration_requests rr
    WHERE lower(rr.email) = lower(norm_email)
    LIMIT 1;

    IF waitlist_rr_status = 'approved' THEN
      is_approved := true;
      IF waitlist_rr_role IN ('student', 'tutor') THEN
        user_role := waitlist_rr_role;
      END IF;
    END IF;
  END IF;

  user_access_status := CASE WHEN is_approved THEN 'approved' ELSE 'pending' END;

  INSERT INTO public.users (id, role, approved, status)
  VALUES (NEW.id, user_role, is_approved, user_access_status)
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
        WHEN registration_requests.status IN ('approved', 'rejected') THEN registration_requests.role
        ELSE EXCLUDED.role
      END,
      status = CASE
        WHEN registration_requests.status IN ('approved', 'rejected') THEN registration_requests.status
        ELSE EXCLUDED.status
      END,
      updated_at = NOW();
  END IF;

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

-- Idempotent repair: approved + status + role from waitlist (059 originally missed role).
UPDATE users u
SET
  role = CASE
    WHEN u.role = 'tutor' AND rr.role = 'student' THEN u.role
    ELSE rr.role
  END,
  approved = true,
  status = 'approved',
  updated_at = NOW()
FROM auth.users au
JOIN registration_requests rr
  ON LOWER(rr.email) = LOWER(au.email)
WHERE
  u.id = au.id
  AND rr.status = 'approved'
  AND rr.role IN ('student', 'tutor')
  AND (
    u.role IS DISTINCT FROM rr.role
    OR u.approved IS DISTINCT FROM true
    OR COALESCE(u.status, 'pending') <> 'approved'
  );
