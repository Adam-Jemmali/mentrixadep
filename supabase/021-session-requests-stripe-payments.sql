-- Link paid Checkout sessions to session_requests for automatic refund on tutor reject.
ALTER TABLE session_requests
  ADD COLUMN IF NOT EXISTS stripe_checkout_session_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_payment_intent_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_refund_id TEXT;

COMMENT ON COLUMN session_requests.stripe_checkout_session_id IS 'Stripe Checkout Session cs_... (metadata must match booking)';
COMMENT ON COLUMN session_requests.stripe_payment_intent_id IS 'PaymentIntent pi_... for refunds';
COMMENT ON COLUMN session_requests.stripe_refund_id IS 'Stripe Refund re_... after tutor rejection refund';

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_requests_stripe_checkout_unique
  ON session_requests(stripe_checkout_session_id)
  WHERE stripe_checkout_session_id IS NOT NULL;
