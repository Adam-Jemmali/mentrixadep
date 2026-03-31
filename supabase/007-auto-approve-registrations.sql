-- ============================================================
-- System settings table + auto-approve registrations
-- Run after 006-sessions-price.sql in Supabase SQL Editor
-- ============================================================

CREATE TABLE IF NOT EXISTS system_settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system_settings" ON system_settings;
CREATE POLICY "Admins can read system_settings" ON system_settings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND approved = true)
  );

DROP POLICY IF EXISTS "Admins can manage system_settings" ON system_settings;
CREATE POLICY "Admins can manage system_settings" ON system_settings
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND approved = true)
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin' AND approved = true)
  );

-- Seed the default setting (auto-approve OFF by default)
INSERT INTO system_settings (key, value)
VALUES ('auto_approve_registrations', '{"enabled": false}'::jsonb)
ON CONFLICT (key) DO NOTHING;

-- Helper: check if auto-approve registrations is enabled
CREATE OR REPLACE FUNCTION is_auto_approve_registrations()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN COALESCE(
    (SELECT (value->>'enabled')::boolean FROM system_settings WHERE key = 'auto_approve_registrations'),
    false
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Update the new-user trigger to auto-approve when the setting is enabled
CREATE OR REPLACE FUNCTION handle_new_user_with_jwt()
RETURNS TRIGGER AS $$
DECLARE user_role TEXT; is_approved BOOLEAN; auto_reg BOOLEAN;
BEGIN
  user_role := COALESCE(NEW.raw_user_meta_data->>'role', 'student');

  -- Admins are always auto-approved
  IF user_role = 'admin' THEN
    is_approved := true;
  ELSE
    -- Check system setting for auto-approve registrations
    auto_reg := is_auto_approve_registrations();
    is_approved := auto_reg;
  END IF;

  INSERT INTO public.users (id, role, approved) VALUES (NEW.id, user_role, is_approved)
  ON CONFLICT (id) DO NOTHING;

  UPDATE auth.users SET raw_user_meta_data = jsonb_build_object('role', user_role, 'approved', is_approved)
  WHERE id = NEW.id;

  IF user_role != 'admin' THEN
    INSERT INTO public.registration_requests (email, role, status)
    VALUES (NEW.email, user_role, CASE WHEN is_approved THEN 'approved' ELSE 'pending' END)
    ON CONFLICT (email) DO UPDATE SET
      status = CASE WHEN is_approved THEN 'approved' ELSE 'pending' END,
      updated_at = NOW();
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
