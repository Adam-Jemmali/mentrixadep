-- Student Momentum subscription billing (Stripe webhook driven + daily reconciliation).
-- Run after 121-session-retest-schedule.sql

CREATE TABLE IF NOT EXISTS public.student_subscriptions (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  stripe_customer_id text,
  stripe_subscription_id text UNIQUE,
  billing_interval text NOT NULL CHECK (billing_interval IN ('monthly', 'annual')),
  local_status text NOT NULL,
  stripe_status text,
  current_period_end timestamptz,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  mismatch_flagged_at timestamptz,
  mismatch_detail text,
  last_reconciled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_stripe_subscription
  ON public.student_subscriptions (stripe_subscription_id);

CREATE INDEX IF NOT EXISTS idx_student_subscriptions_mismatch
  ON public.student_subscriptions (mismatch_flagged_at)
  WHERE mismatch_flagged_at IS NOT NULL;

ALTER TABLE public.student_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_subscriptions_read_own ON public.student_subscriptions;
CREATE POLICY student_subscriptions_read_own ON public.student_subscriptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS student_subscriptions_service ON public.student_subscriptions;
CREATE POLICY student_subscriptions_service ON public.student_subscriptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.student_subscriptions IS
  'Momentum tier subscription status. Updated by Stripe webhooks; reconciled daily without silent correction.';

CREATE TABLE IF NOT EXISTS public.subscription_status_mismatches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  stripe_subscription_id text,
  local_status text NOT NULL,
  stripe_status text NOT NULL,
  detail text,
  flagged_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_subscription_status_mismatches_open
  ON public.subscription_status_mismatches (flagged_at DESC)
  WHERE resolved_at IS NULL;

ALTER TABLE public.subscription_status_mismatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subscription_status_mismatches_service ON public.subscription_status_mismatches;
CREATE POLICY subscription_status_mismatches_service ON public.subscription_status_mismatches
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.subscription_status_mismatches IS
  'Local vs Stripe subscription status drift flagged by daily reconciliation for manual review.';
