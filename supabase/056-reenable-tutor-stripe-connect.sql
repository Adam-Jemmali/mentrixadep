-- Re-enable tutor Stripe Connect payout pipeline.
-- Safe after 055: uses IF NOT EXISTS semantics.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_at TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_account_id
  ON users (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS tutor_payout_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id uuid REFERENCES sessions(id) ON DELETE SET NULL,
  session_date timestamptz,
  student_id uuid REFERENCES users(id) ON DELETE SET NULL,
  course text,
  gross_cents integer NOT NULL DEFAULT 0,
  platform_fee_cents integer NOT NULL DEFAULT 0,
  net_cents integer NOT NULL DEFAULT 0,
  transfer_id text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','held','transferred','failed','refunded')),
  hold_until timestamptz,
  transferred_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_ledger_tutor ON tutor_payout_ledger (tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_session ON tutor_payout_ledger (session_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_hold ON tutor_payout_ledger (hold_until, status);

ALTER TABLE tutor_payout_ledger ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'tutor_payout_ledger'
      AND policyname = 'tutors_read_own_payouts'
  ) THEN
    CREATE POLICY "tutors_read_own_payouts"
      ON tutor_payout_ledger FOR SELECT
      USING (auth.uid() = tutor_id);
  END IF;
END
$$;

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS stripe_transfer_id TEXT,
  ADD COLUMN IF NOT EXISTS payout_status TEXT
    CHECK (payout_status IN ('pending','held','transferred','failed','refunded'));
