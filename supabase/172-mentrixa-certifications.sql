-- Mentrixa Certification (prompt said 150; that number is taken — use 172).
-- Issued when calibrated peer standing first crosses the 90 threshold.

CREATE TABLE IF NOT EXISTS public.mentrixa_certifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  issued_at timestamptz NOT NULL DEFAULT now(),
  verified_percentile numeric(5, 2) NOT NULL,
  nodes_verified int NOT NULL,
  total_nodes int NOT NULL,
  accuracy_overall numeric(5, 2) NOT NULL,
  verification_token text NOT NULL UNIQUE
    DEFAULT encode(gen_random_bytes(16), 'hex'),
  revoked_at timestamptz,
  revoke_reason text,
  below_threshold_since timestamptz,
  UNIQUE (user_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_mentrixa_certifications_user
  ON public.mentrixa_certifications (user_id);

CREATE INDEX IF NOT EXISTS idx_mentrixa_certifications_token
  ON public.mentrixa_certifications (verification_token);

CREATE INDEX IF NOT EXISTS idx_mentrixa_certifications_active
  ON public.mentrixa_certifications (subject)
  WHERE revoked_at IS NULL;

ALTER TABLE public.mentrixa_certifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mentrixa_certifications_owner_read ON public.mentrixa_certifications;
CREATE POLICY mentrixa_certifications_owner_read ON public.mentrixa_certifications
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mentrixa_certifications_service ON public.mentrixa_certifications;
CREATE POLICY mentrixa_certifications_service ON public.mentrixa_certifications
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.mentrixa_certifications IS
  'Mentrixa Certification. Issued on first peer-standing cross of 90. Public via verification_token.';

COMMENT ON COLUMN public.mentrixa_certifications.verified_percentile IS
  'CUME_DIST peer standing at issue (beat count). UI shows Top %.';

COMMENT ON COLUMN public.mentrixa_certifications.below_threshold_since IS
  'When peer standing first fell below 85 while certified. Revoke after 30 consecutive days.';
