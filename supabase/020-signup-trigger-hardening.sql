-- ============================================================
-- Harden auth signup trigger (fixes "Database error saving new user")
-- Run in Supabase SQL Editor after 007-auto-approve-registrations.sql
--
-- Common failures:
-- - raw_user_meta_data.role not exactly student|tutor|admin (CHECK on public.users)
-- - NULL/empty email when inserting registration_requests (NOT NULL on email)
-- - SECURITY DEFINER without search_path resolving wrong schema
-- ============================================================

CREATE OR REPLACE FUNCTION is_auto_approve_registrations()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (
      SELECT (value->>'enabled')::boolean
      FROM public.system_settings
      WHERE key = 'auto_approve_registrations'
    ),
    false
  );
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;

CREATE OR REPLACE FUNCTION handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
DECLARE
  user_role TEXT;
  is_approved BOOLEAN;
  auto_reg BOOLEAN;
  norm_email TEXT;
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public;
