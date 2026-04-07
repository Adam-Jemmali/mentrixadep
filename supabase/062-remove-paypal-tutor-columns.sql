-- Remove tutor PayPal payout columns (marketplace uses Stripe Connect only).

DROP INDEX IF EXISTS idx_users_paypal_payout_email;

ALTER TABLE users
  DROP COLUMN IF EXISTS paypal_payout_email,
  DROP COLUMN IF EXISTS paypal_payouts_enabled,
  DROP COLUMN IF EXISTS paypal_onboarding_at;
