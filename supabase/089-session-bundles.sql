-- Session bundles: track purchased multi-session packs
CREATE TABLE IF NOT EXISTS session_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bundle_size smallint NOT NULL CHECK (bundle_size IN (3, 5)),
  sessions_remaining smallint NOT NULL CHECK (sessions_remaining >= 0),
  per_session_cents integer NOT NULL,
  platform_fee_bps integer NOT NULL DEFAULT 1000,
  stripe_checkout_session_id text,
  stripe_payment_intent_id text,
  purchased_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '90 days'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bundles_student ON session_bundles(student_id);
CREATE INDEX IF NOT EXISTS idx_bundles_tutor ON session_bundles(tutor_id);
CREATE INDEX IF NOT EXISTS idx_bundles_active ON session_bundles(student_id, tutor_id)
  WHERE sessions_remaining > 0;

ALTER TABLE session_bundles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students can view own bundles"
  ON session_bundles FOR SELECT
  USING (auth.uid() = student_id);

CREATE POLICY "Tutors can view bundles assigned to them"
  ON session_bundles FOR SELECT
  USING (auth.uid() = tutor_id);

CREATE POLICY "Service role full access to bundles"
  ON session_bundles FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');
