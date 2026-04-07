-- Tutor payouts via PayPal (Stripe remains student checkout provider).

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS paypal_payout_email TEXT,
  ADD COLUMN IF NOT EXISTS paypal_payouts_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS paypal_onboarding_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_users_paypal_payout_email
  ON users (paypal_payout_email)
  WHERE paypal_payout_email IS NOT NULL;
