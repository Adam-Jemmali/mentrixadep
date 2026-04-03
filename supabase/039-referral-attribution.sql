-- Referral attribution: optional fraud flags + extend signup trigger with referral_code from auth metadata.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS referral_flagged BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS referral_last_ip_hash TEXT;

COMMENT ON COLUMN public.users.referral_flagged IS 'Set when automated checks suspect abuse; referred_by may still be null.';
COMMENT ON COLUMN public.users.referral_last_ip_hash IS 'SHA-256 hex of last successful referral signup IP (server-only updates).';

-- ─── Extend handle_new_user_with_jwt: set referred_by from raw_user_meta_data.referral_code ─
CREATE OR REPLACE FUNCTION public.handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
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
  IF user_role NOT IN ('student', 'tutor', 'admin') THEN
    user_role := 'student';
  END IF;

  IF user_role = 'admin' THEN
    is_approved := true;
  ELSE
    auto_reg := is_auto_approve_registrations();
    is_approved := auto_reg;
  END IF;

  INSERT INTO public.users (id, role, approved)
  VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;

  UPDATE auth.users
  SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
  WHERE id = NEW.id;

  norm_email := NULLIF(trim(COALESCE(NEW.email, '')), '');

  IF user_role != 'admin' AND norm_email IS NOT NULL THEN
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
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
