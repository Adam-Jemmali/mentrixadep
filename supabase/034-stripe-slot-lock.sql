-- Stripe slot-lock: prevent double-booking during Checkout window.
-- Run after 033-knowledge-graph.sql

-- ─── 1. Slot locking on availability ─────────────────────────────────────────
-- booking_status tracks whether the slot is open, locked by a pending checkout,
-- or permanently booked.  'available' is the default / unlocked state.

ALTER TABLE availability
  ADD COLUMN IF NOT EXISTS booking_status TEXT NOT NULL DEFAULT 'available'
    CHECK (booking_status IN ('available', 'pending_payment', 'booked')),
  ADD COLUMN IF NOT EXISTS locked_until    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS locked_by       UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT;

CREATE INDEX IF NOT EXISTS idx_availability_booking_status
  ON availability (booking_status, locked_until);

COMMENT ON COLUMN availability.booking_status IS
  'available = open; pending_payment = Stripe Checkout open (30-min lock); booked = confirmed booking';
COMMENT ON COLUMN availability.locked_until IS
  'UTC timestamp when pending_payment lock expires and slot reverts to available';
COMMENT ON COLUMN availability.locked_by IS
  'student_id that holds the pending_payment lock';

-- ─── 2. Stripe webhook idempotency log ───────────────────────────────────────
-- Prevent duplicate processing of the same Stripe event.

CREATE TABLE IF NOT EXISTS stripe_webhook_log (
  event_id   TEXT        NOT NULL PRIMARY KEY,   -- Stripe event id  evt_...
  event_type TEXT        NOT NULL,
  processed_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE stripe_webhook_log IS
  'Idempotency guard: one row per processed Stripe event_id.';

-- ─── 3. Sessions: stripe fields ──────────────────────────────────────────────
-- Store payment_intent and checkout IDs on sessions for refunds.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id   TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id           TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_reason       TEXT,
  ADD COLUMN IF NOT EXISTS platform_fee_cents         INTEGER;

-- ─── 4. Auto-unlock expired pending_payment slots (pg_cron or cron route) ────
-- Informational only — call this from the cron job or run via pg_cron:
-- UPDATE availability
--   SET booking_status = 'available', locked_until = NULL, locked_by = NULL
--  WHERE booking_status = 'pending_payment' AND locked_until < now();
