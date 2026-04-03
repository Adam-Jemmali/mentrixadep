-- ============================================================
-- 036-verification-system.sql
-- Background verification system for tutors (24h) and students (48h).
-- Users have full app access during the window; admins verify async.
-- Failed/fake accounts are blacklisted.
-- ============================================================

-- Verification status enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'verification_status') THEN
    CREATE TYPE verification_status AS ENUM (
      'pending',      -- Submitted, awaiting admin review
      'in_review',    -- Admin has started review
      'approved',     -- Passed verification
      'rejected',     -- Failed verification (can resubmit)
      'blacklisted',  -- Banned — fake/fraudulent info
      'info_requested' -- Admin requested more info via email
    );
  END IF;
END $$;

-- Main verification requests table
CREATE TABLE IF NOT EXISTS user_verifications (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role              text NOT NULL CHECK (role IN ('tutor', 'student')),

  -- Verification window
  submitted_at      timestamptz NOT NULL DEFAULT now(),
  deadline_at       timestamptz NOT NULL, -- 24h for tutor, 48h for student
  reviewed_at       timestamptz,
  reviewed_by       uuid REFERENCES users(id),

  status            verification_status NOT NULL DEFAULT 'pending',

  -- Admin notes (internal)
  admin_notes       text,

  -- Info request tracking
  info_requested_at timestamptz,
  info_request_message text,
  info_responded_at timestamptz,
  info_response     text,

  -- Rejection/blacklist reason (sent to user)
  outcome_reason    text,

  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- Blacklisted users table
CREATE TABLE IF NOT EXISTS blacklisted_users (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id         uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  blacklisted_by  uuid REFERENCES users(id),
  reason          text NOT NULL,
  blacklisted_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Verification audit log
CREATE TABLE IF NOT EXISTS verification_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  verification_id uuid NOT NULL REFERENCES user_verifications(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL,
  admin_id        uuid REFERENCES users(id),
  action          text NOT NULL, -- 'submitted', 'started_review', 'approved', 'rejected', 'blacklisted', 'info_requested', 'info_responded', 'email_sent'
  notes           text,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- Add verification_status to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_status verification_status DEFAULT 'pending';
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_blacklisted boolean NOT NULL DEFAULT false;
ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_id uuid REFERENCES user_verifications(id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);
CREATE INDEX IF NOT EXISTS idx_user_verifications_deadline ON user_verifications(deadline_at) WHERE status IN ('pending', 'in_review', 'info_requested');
CREATE INDEX IF NOT EXISTS idx_blacklisted_users_user_id ON blacklisted_users(user_id);
CREATE INDEX IF NOT EXISTS idx_verification_audit_log_verification_id ON verification_audit_log(verification_id);

-- Trigger: update updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS user_verifications_updated_at ON user_verifications;
CREATE TRIGGER user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Function: auto-create verification on user insert (called from app layer or trigger)
-- Sets deadline based on role: tutor = 24h, student = 48h
CREATE OR REPLACE FUNCTION create_user_verification(p_user_id uuid, p_role text)
RETURNS uuid AS $$
DECLARE
  v_deadline timestamptz;
  v_verification_id uuid;
BEGIN
  IF p_role = 'tutor' THEN
    v_deadline := now() + INTERVAL '24 hours';
  ELSE
    v_deadline := now() + INTERVAL '48 hours';
  END IF;

  INSERT INTO user_verifications (user_id, role, deadline_at)
  VALUES (p_user_id, p_role, v_deadline)
  RETURNING id INTO v_verification_id;

  UPDATE users SET verification_id = v_verification_id WHERE id = p_user_id;

  INSERT INTO verification_audit_log (verification_id, user_id, action, notes)
  VALUES (v_verification_id, p_user_id, 'submitted', 'Verification automatically created on registration');

  RETURN v_verification_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RLS Policies
ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE blacklisted_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE verification_audit_log ENABLE ROW LEVEL SECURITY;

-- Users can view their own verification
CREATE POLICY "users_view_own_verification" ON user_verifications
  FOR SELECT USING (auth.uid() = user_id);

-- Admins have full access (service role bypasses RLS)
CREATE POLICY "admins_full_verification_access" ON user_verifications
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_full_blacklist_access" ON blacklisted_users
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "admins_full_audit_access" ON verification_audit_log
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
