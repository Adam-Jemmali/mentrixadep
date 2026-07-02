-- Quarter Sprint Pack credits with 90-day expiry (Phase 4A).
-- Run after 142-loop-sla-grants.sql

CREATE TABLE IF NOT EXISTS public.momentum_pack_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  credits_granted smallint NOT NULL CHECK (credits_granted >= 0),
  credits_remaining smallint NOT NULL CHECK (credits_remaining >= 0),
  stripe_checkout_session_id text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT momentum_pack_credits_remaining_lte_granted CHECK (credits_remaining <= credits_granted)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_momentum_pack_credits_checkout
  ON public.momentum_pack_credits (stripe_checkout_session_id);

CREATE INDEX IF NOT EXISTS idx_momentum_pack_credits_user_active
  ON public.momentum_pack_credits (user_id, expires_at ASC)
  WHERE credits_remaining > 0;

ALTER TABLE public.momentum_pack_credits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS momentum_pack_credits_read_own ON public.momentum_pack_credits;
CREATE POLICY momentum_pack_credits_read_own ON public.momentum_pack_credits
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS momentum_pack_credits_service ON public.momentum_pack_credits;
CREATE POLICY momentum_pack_credits_service ON public.momentum_pack_credits
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

ALTER TABLE public.momentum_session_credit_redemptions
  ALTER COLUMN credit_id DROP NOT NULL;

ALTER TABLE public.momentum_session_credit_redemptions
  ADD COLUMN IF NOT EXISTS pack_credit_id uuid REFERENCES public.momentum_pack_credits (id) ON DELETE RESTRICT;

ALTER TABLE public.momentum_session_credit_redemptions
  DROP CONSTRAINT IF EXISTS momentum_session_credit_redemptions_credit_source;

ALTER TABLE public.momentum_session_credit_redemptions
  ADD CONSTRAINT momentum_session_credit_redemptions_credit_source CHECK (
    (credit_id IS NOT NULL AND pack_credit_id IS NULL)
    OR (credit_id IS NULL AND pack_credit_id IS NOT NULL)
  );

COMMENT ON TABLE public.momentum_pack_credits IS
  'Quarter Sprint Pack Guide session credits; expire 90 days after grant. Consumed before monthly credits when expiring sooner.';
