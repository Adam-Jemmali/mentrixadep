-- Remove tutor-side Stripe Connect artifacts.
-- Student Stripe checkout remains active.

DROP POLICY IF EXISTS "tutors_read_own_payouts" ON tutor_payout_ledger;
DROP TABLE IF EXISTS tutor_payout_ledger;

DROP INDEX IF EXISTS idx_users_stripe_account_id;

ALTER TABLE users
  DROP COLUMN IF EXISTS stripe_account_id,
  DROP COLUMN IF EXISTS stripe_payouts_enabled,
  DROP COLUMN IF EXISTS stripe_onboarding_at;

ALTER TABLE sessions
  DROP COLUMN IF EXISTS stripe_transfer_id,
  DROP COLUMN IF EXISTS payout_status;
