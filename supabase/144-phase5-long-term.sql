-- Phase 5 long-term infrastructure: alumni tier, subject gates, unified trajectory, certificates, parent custodians.
-- Run after 143-momentum-pack-credits.sql

ALTER TABLE public.student_subscriptions
  ADD COLUMN IF NOT EXISTS plan_tier text NOT NULL DEFAULT 'momentum';

ALTER TABLE public.student_subscriptions
  DROP CONSTRAINT IF EXISTS student_subscriptions_plan_tier_check;

ALTER TABLE public.student_subscriptions
  ADD CONSTRAINT student_subscriptions_plan_tier_check CHECK (
    plan_tier IN ('momentum', 'alumni')
  );

COMMENT ON COLUMN public.student_subscriptions.plan_tier IS
  'momentum = full tier; alumni = archive read + one included session credit per quarter.';

ALTER TABLE public.momentum_session_credits
  DROP CONSTRAINT IF EXISTS momentum_session_credits_user_period;

ALTER TABLE public.momentum_session_credits
  ADD CONSTRAINT momentum_session_credits_user_period_source UNIQUE (user_id, period_month, grant_source);

ALTER TABLE public.momentum_session_credits
  DROP CONSTRAINT IF EXISTS momentum_session_credits_grant_source_check;

ALTER TABLE public.momentum_session_credits
  ADD CONSTRAINT momentum_session_credits_grant_source_check CHECK (
    grant_source IN (
      'subscription_checkout',
      'subscription_invoice',
      'monthly_grant',
      'sla_makegood',
      'alumni_quarterly'
    )
  );

CREATE TABLE IF NOT EXISTS public.subject_momentum_gates (
  subject text PRIMARY KEY,
  momentum_eligible boolean NOT NULL DEFAULT false,
  min_verified_first_attempts integer NOT NULL DEFAULT 5000,
  min_reviewed_items integer NOT NULL DEFAULT 200,
  eligible_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.subject_momentum_gates (subject, momentum_eligible, eligible_at)
VALUES ('AP Calculus AB', true, now())
ON CONFLICT (subject) DO UPDATE SET
  momentum_eligible = EXCLUDED.momentum_eligible,
  eligible_at = COALESCE(public.subject_momentum_gates.eligible_at, EXCLUDED.eligible_at),
  updated_at = now();

ALTER TABLE public.subject_momentum_gates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subject_momentum_gates_read_all ON public.subject_momentum_gates;
CREATE POLICY subject_momentum_gates_read_all ON public.subject_momentum_gates
  FOR SELECT USING (true);

DROP POLICY IF EXISTS subject_momentum_gates_service ON public.subject_momentum_gates;
CREATE POLICY subject_momentum_gates_service ON public.subject_momentum_gates
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.trajectory_index_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  score smallint NOT NULL CHECK (score >= 0 AND score <= 100),
  components jsonb NOT NULL DEFAULT '{}'::jsonb,
  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trajectory_index_snapshots_user_subject_date UNIQUE (user_id, subject, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_trajectory_index_snapshots_user_date
  ON public.trajectory_index_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.trajectory_index_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trajectory_index_snapshots_read_own ON public.trajectory_index_snapshots;
CREATE POLICY trajectory_index_snapshots_read_own ON public.trajectory_index_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trajectory_index_snapshots_service ON public.trajectory_index_snapshots;
CREATE POLICY trajectory_index_snapshots_service ON public.trajectory_index_snapshots
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.unified_trajectory_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  score smallint NOT NULL CHECK (score >= 0 AND score <= 100),
  subject_scores jsonb NOT NULL DEFAULT '[]'::jsonb,
  snapshot_date date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT unified_trajectory_snapshots_user_date UNIQUE (user_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_unified_trajectory_snapshots_user_date
  ON public.unified_trajectory_snapshots (user_id, snapshot_date DESC);

ALTER TABLE public.unified_trajectory_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS unified_trajectory_snapshots_read_own ON public.unified_trajectory_snapshots;
CREATE POLICY unified_trajectory_snapshots_read_own ON public.unified_trajectory_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS unified_trajectory_snapshots_service ON public.unified_trajectory_snapshots;
CREATE POLICY unified_trajectory_snapshots_service ON public.unified_trajectory_snapshots
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.trajectory_certificate_exports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  verified_percentile numeric(5, 2),
  export_kind text NOT NULL DEFAULT 'trajectory_archive' CHECK (
    export_kind IN ('trajectory_archive')
  ),
  generated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_trajectory_certificate_exports_user
  ON public.trajectory_certificate_exports (user_id, generated_at DESC);

ALTER TABLE public.trajectory_certificate_exports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trajectory_certificate_exports_read_own ON public.trajectory_certificate_exports;
CREATE POLICY trajectory_certificate_exports_read_own ON public.trajectory_certificate_exports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS trajectory_certificate_exports_service ON public.trajectory_certificate_exports;
CREATE POLICY trajectory_certificate_exports_service ON public.trajectory_certificate_exports
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.parent_custodian_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  custodian_email text NOT NULL,
  invite_token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT parent_custodian_invites_token_hash UNIQUE (invite_token_hash)
);

CREATE INDEX IF NOT EXISTS idx_parent_custodian_invites_student
  ON public.parent_custodian_invites (student_id, created_at DESC);

ALTER TABLE public.parent_custodian_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_custodian_invites_student ON public.parent_custodian_invites;
CREATE POLICY parent_custodian_invites_student ON public.parent_custodian_invites
  FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS parent_custodian_invites_service ON public.parent_custodian_invites;
CREATE POLICY parent_custodian_invites_service ON public.parent_custodian_invites
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

CREATE TABLE IF NOT EXISTS public.parent_custodian_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  custodian_email text NOT NULL,
  invite_id uuid REFERENCES public.parent_custodian_invites (id) ON DELETE SET NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CONSTRAINT parent_custodian_access_student_email UNIQUE (student_id, custodian_email)
);

CREATE INDEX IF NOT EXISTS idx_parent_custodian_access_email
  ON public.parent_custodian_access (custodian_email)
  WHERE revoked_at IS NULL;

ALTER TABLE public.parent_custodian_access ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS parent_custodian_access_student ON public.parent_custodian_access;
CREATE POLICY parent_custodian_access_student ON public.parent_custodian_access
  FOR ALL USING (auth.uid() = student_id);

DROP POLICY IF EXISTS parent_custodian_access_service ON public.parent_custodian_access;
CREATE POLICY parent_custodian_access_service ON public.parent_custodian_access
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.subject_momentum_gates IS
  'Subjects eligible for the full Momentum stack once the bar is met.';
COMMENT ON TABLE public.unified_trajectory_snapshots IS
  'Cross-subject Trajectory Index rollup for multi-subject Momentum subscribers.';
COMMENT ON TABLE public.parent_custodian_access IS
  'Read-only exam-season trajectory access for parent custodians.';
