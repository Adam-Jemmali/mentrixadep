-- Stripe Connect: tutor payout accounts and transfer ledger.
-- Run after 034-stripe-slot-lock.sql

-- ─── 1. Stripe Connect fields on users ───────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_account_id       TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payouts_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_onboarding_at    TIMESTAMPTZ;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_account_id
  ON users (stripe_account_id)
  WHERE stripe_account_id IS NOT NULL;

COMMENT ON COLUMN users.stripe_account_id      IS 'Stripe Connect Express account id (acct_...)';
COMMENT ON COLUMN users.stripe_payouts_enabled IS 'True once Stripe onboarding & payout setup complete';
COMMENT ON COLUMN users.stripe_onboarding_at   IS 'When the tutor first completed Connect onboarding';

-- ─── 2. Payout transfer ledger ────────────────────────────────────────────────
-- One row per tutor payout for a completed session (after 7-day hold).
-- transfer_id = Stripe Transfer tr_... (null until transfer fires).

CREATE TABLE IF NOT EXISTS tutor_payout_ledger (
  id               uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  tutor_id         uuid        NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_id       uuid        REFERENCES sessions(id) ON DELETE SET NULL,
  session_date     timestamptz,
  student_id       uuid        REFERENCES users(id) ON DELETE SET NULL,
  course           text,
  gross_cents      integer     NOT NULL DEFAULT 0,  -- full session price paid by student
  platform_fee_cents integer   NOT NULL DEFAULT 0,  -- 15% retained by Mentrixa
  net_cents        integer     NOT NULL DEFAULT 0,  -- 85% transferred to tutor
  transfer_id      text,                             -- Stripe tr_...
  status           text        NOT NULL DEFAULT 'pending'
                     CHECK (status IN ('pending','held','transferred','failed','refunded')),
  hold_until       timestamptz,                      -- transfer fires after this timestamp
  transferred_at   timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payout_ledger_tutor   ON tutor_payout_ledger (tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_session ON tutor_payout_ledger (session_id);
CREATE INDEX IF NOT EXISTS idx_payout_ledger_hold    ON tutor_payout_ledger (hold_until, status);

COMMENT ON TABLE tutor_payout_ledger IS
  'Per-session payout rows. Transfers fire after hold_until (7-day default).';

-- RLS: tutors read own rows; service role writes
ALTER TABLE tutor_payout_ledger ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tutors_read_own_payouts"
  ON tutor_payout_ledger FOR SELECT
  USING (auth.uid() = tutor_id);

-- ─── 3. Session: stripe transfer tracking ────────────────────────────────────

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS stripe_transfer_id    TEXT,
  ADD COLUMN IF NOT EXISTS payout_status         TEXT
    CHECK (payout_status IN ('pending','held','transferred','failed','refunded'));
