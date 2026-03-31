-- Track which Stripe Checkout sessions already had duel credits consumed (idempotency).
CREATE TABLE IF NOT EXISTS duel_credit_checkout_applications (
  checkout_session_id TEXT PRIMARY KEY,
  student_id UUID NOT NULL,
  tutor_id UUID NOT NULL,
  discount_cents INT NOT NULL CHECK (discount_cents >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_duel_credit_checkout_student ON duel_credit_checkout_applications(student_id);

COMMENT ON TABLE duel_credit_checkout_applications IS 'One row per checkout session after duel credits were applied; prevents double consumption on webhook retry.';
