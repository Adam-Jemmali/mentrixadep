-- Allow  Momentum members to receive monthly included session credits.
-- Run after 145-duel-forfeit.sql

ALTER TABLE public.momentum_session_credits
  DROP CONSTRAINT IF EXISTS momentum_session_credits_grant_source_check;

ALTER TABLE public.momentum_session_credits
  ADD CONSTRAINT momentum_session_credits_grant_source_check CHECK (
    grant_source IN (
      'subscription_checkout',
      'subscription_invoice',
      'monthly_grant',
      'sla_makegood',
      'alumni_quarterly',
      'comp_member'
    )
  );

COMMENT ON COLUMN public.momentum_session_credits.grant_source IS
  'comp_member = complimentary Momentum access without Stripe subscription.';
