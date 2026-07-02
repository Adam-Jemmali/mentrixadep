-- Momentum included Guide session credits (P0 Epic 2).
-- Run after 138-division-forum-apply.sql

CREATE TABLE IF NOT EXISTS public.momentum_session_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  period_month date NOT NULL,
  credits_granted smallint NOT NULL DEFAULT 1 CHECK (credits_granted >= 0),
  credits_remaining smallint NOT NULL DEFAULT 1 CHECK (credits_remaining >= 0),
  stripe_invoice_id text,
  grant_source text NOT NULL DEFAULT 'monthly_grant' CHECK (
    grant_source IN ('subscription_checkout', 'subscription_invoice', 'monthly_grant')
  ),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT momentum_session_credits_user_period UNIQUE (user_id, period_month),
  CONSTRAINT momentum_session_credits_remaining_lte_granted CHECK (credits_remaining <= credits_granted)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_momentum_session_credits_invoice
  ON public.momentum_session_credits (stripe_invoice_id)
  WHERE stripe_invoice_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_momentum_session_credits_user_remaining
  ON public.momentum_session_credits (user_id, period_month DESC)
  WHERE credits_remaining > 0;

ALTER TABLE public.momentum_session_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS momentum_session_credits_read_own ON public.momentum_session_credits;
CREATE POLICY momentum_session_credits_read_own ON public.momentum_session_credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS momentum_session_credits_service ON public.momentum_session_credits;
CREATE POLICY momentum_session_credits_service ON public.momentum_session_credits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.momentum_session_credit_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credit_id uuid NOT NULL REFERENCES public.momentum_session_credits (id) ON DELETE RESTRICT,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  availability_id uuid NOT NULL REFERENCES public.availability (id) ON DELETE RESTRICT,
  session_request_id uuid REFERENCES public.session_requests (id) ON DELETE SET NULL,
  idempotency_key text NOT NULL,
  redeemed_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT momentum_session_credit_redemptions_idempotency UNIQUE (idempotency_key),
  CONSTRAINT momentum_session_credit_redemptions_availability UNIQUE (availability_id)
);

CREATE INDEX IF NOT EXISTS idx_momentum_session_credit_redemptions_user
  ON public.momentum_session_credit_redemptions (user_id, redeemed_at DESC);

ALTER TABLE public.momentum_session_credit_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS momentum_session_credit_redemptions_read_own ON public.momentum_session_credit_redemptions;
CREATE POLICY momentum_session_credit_redemptions_read_own ON public.momentum_session_credit_redemptions
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS momentum_session_credit_redemptions_service ON public.momentum_session_credit_redemptions;
CREATE POLICY momentum_session_credit_redemptions_service ON public.momentum_session_credit_redemptions
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.momentum_session_credits IS
  'One included Guide session credit per UTC month for active Momentum subscribers.';

COMMENT ON TABLE public.momentum_session_credit_redemptions IS
  'Audit trail when a Momentum session credit is redeemed at booking time.';
