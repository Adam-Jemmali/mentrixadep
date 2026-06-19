-- Verified First Attempt: one row per user per skill node (AP Calculus AB rank honesty).
-- Run after 108-ebbinghaus-review-schedule.sql

ALTER TABLE public.user_quest_progress
  ADD COLUMN IF NOT EXISTS is_first_attempt_for_node boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS skill_node_id uuid REFERENCES public.skill_nodes (id);

CREATE TABLE IF NOT EXISTS public.verified_first_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.item_bank (id) ON DELETE CASCADE,
  is_correct boolean NOT NULL,
  attempted_at timestamptz DEFAULT now(),
  UNIQUE (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_vfa_user
  ON public.verified_first_attempts (user_id);

ALTER TABLE public.verified_first_attempts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS vfa_read_own ON public.verified_first_attempts;
CREATE POLICY vfa_read_own ON public.verified_first_attempts
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.verified_first_attempts IS
  'Immutable first attempt per user per skill node. UNIQUE(user_id, skill_node_id) enforces one verified row.';

COMMENT ON COLUMN public.user_quest_progress.is_first_attempt_for_node IS
  'True when this quest completion recorded at least one new verified first attempt.';

-- Calibrated rank inputs: accuracy and PERCENT_RANK percentile (min 5 verified skills).
CREATE OR REPLACE FUNCTION public.get_verified_first_attempt_rank(p_user_id uuid)
RETURNS TABLE (
  verified_count bigint,
  accuracy_percent integer,
  percentile numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH user_accuracy AS (
    SELECT
      vfa.user_id,
      COUNT(*)::bigint AS attempt_count,
      ROUND(
        (COUNT(*) FILTER (WHERE vfa.is_correct))::numeric * 100.0
        / NULLIF(COUNT(*), 0)
      )::integer AS accuracy_pct
    FROM public.verified_first_attempts vfa
    GROUP BY vfa.user_id
  ),
  eligible AS (
    SELECT * FROM user_accuracy WHERE attempt_count >= 5
  ),
  ranked AS (
    SELECT
      user_id,
      attempt_count,
      accuracy_pct,
      PERCENT_RANK() OVER (ORDER BY accuracy_pct) * 100 AS pct_rank
    FROM eligible
  )
  SELECT
    COALESCE(ua.attempt_count, 0::bigint),
    COALESCE(ua.accuracy_pct, 0),
    r.pct_rank
  FROM (SELECT 1) AS dummy
  LEFT JOIN user_accuracy ua ON ua.user_id = p_user_id
  LEFT JOIN ranked r ON r.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO service_role;
