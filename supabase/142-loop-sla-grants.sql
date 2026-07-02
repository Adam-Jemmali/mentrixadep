-- Momentum Guide Loop SLA make-good grants (Phase 3A).
-- Run after 141-movement-receipts.sql

ALTER TABLE public.momentum_session_credits
  DROP CONSTRAINT IF EXISTS momentum_session_credits_grant_source_check;

ALTER TABLE public.momentum_session_credits
  ADD CONSTRAINT momentum_session_credits_grant_source_check CHECK (
    grant_source IN (
      'subscription_checkout',
      'subscription_invoice',
      'monthly_grant',
      'sla_makegood'
    )
  );

CREATE TABLE IF NOT EXISTS public.momentum_sla_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  intervention_retest_id uuid NOT NULL REFERENCES public.intervention_retests (id) ON DELETE CASCADE,
  session_id uuid REFERENCES public.sessions (id) ON DELETE SET NULL,
  credit_id uuid REFERENCES public.momentum_session_credits (id) ON DELETE SET NULL,
  skill_node_id uuid REFERENCES public.skill_nodes (id) ON DELETE SET NULL,
  pre_accuracy numeric(5, 2),
  post_accuracy numeric(5, 2),
  grant_source text NOT NULL DEFAULT 'sla_makegood' CHECK (grant_source IN ('sla_makegood')),
  idempotency_key text NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  email_sent_at timestamptz,
  movement_receipt_logged_at timestamptz,
  CONSTRAINT momentum_sla_grants_idempotency UNIQUE (idempotency_key),
  CONSTRAINT momentum_sla_grants_retest UNIQUE (intervention_retest_id)
);

CREATE INDEX IF NOT EXISTS idx_momentum_sla_grants_user_granted
  ON public.momentum_sla_grants (user_id, granted_at DESC);

ALTER TABLE public.momentum_sla_grants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS momentum_sla_grants_read_own ON public.momentum_sla_grants;
CREATE POLICY momentum_sla_grants_read_own ON public.momentum_sla_grants
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS momentum_sla_grants_service ON public.momentum_sla_grants;
CREATE POLICY momentum_sla_grants_service ON public.momentum_sla_grants
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.momentum_sla_grants IS
  'Audit trail when Momentum Loop SLA restores an included session credit after a failed coaching loop.';
