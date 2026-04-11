-- Add environment-specific Stripe Connect account columns without removing legacy data.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS stripe_account_id_test TEXT,
  ADD COLUMN IF NOT EXISTS stripe_account_id_live TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_account_id_test
  ON users (stripe_account_id_test)
  WHERE stripe_account_id_test IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_stripe_account_id_live
  ON users (stripe_account_id_live)
  WHERE stripe_account_id_live IS NOT NULL;