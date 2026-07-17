-- VFA for free-response grading: accuracy_pct, per-part keys, 1.5x rolling weight.
-- Run after 158-challenge-difficulty.sql

ALTER TABLE public.verified_first_attempts
  ADD COLUMN IF NOT EXISTS accuracy_pct numeric(4, 3) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS part_key text,
  ADD COLUMN IF NOT EXISTS attempt_format text NOT NULL DEFAULT 'mcq';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'verified_first_attempts_attempt_format_check'
  ) THEN
    ALTER TABLE public.verified_first_attempts
      ADD CONSTRAINT verified_first_attempts_attempt_format_check
      CHECK (attempt_format IN ('mcq', 'free_response', 'multi_part_part'));
  END IF;
END $$;

COMMENT ON COLUMN public.verified_first_attempts.accuracy_pct IS
  '1.0 fully correct, partial_credit_fraction for partial, 0.0 incorrect. Drives rank when present.';

COMMENT ON COLUMN public.verified_first_attempts.part_key IS
  'Multi-part letter key (a, b, c). Null for single-shot items.';

COMMENT ON COLUMN public.verified_first_attempts.attempt_format IS
  'mcq | free_response | multi_part_part. Free-response rows weigh 1.5x in rolling stats.';

-- First grading gate per (user, item, part) before the student sees the result.
CREATE TABLE IF NOT EXISTS public.verified_first_grading_keys (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  item_id uuid NOT NULL REFERENCES public.item_bank (id) ON DELETE CASCADE,
  part_key text NOT NULL DEFAULT '',
  graded_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, item_id, part_key)
);

CREATE INDEX IF NOT EXISTS idx_verified_first_grading_keys_user
  ON public.verified_first_grading_keys (user_id, graded_at DESC);

ALTER TABLE public.verified_first_grading_keys ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.verified_first_grading_keys FROM PUBLIC;
GRANT SELECT, INSERT ON TABLE public.verified_first_grading_keys TO authenticated;
GRANT ALL ON TABLE public.verified_first_grading_keys TO service_role;

DROP POLICY IF EXISTS verified_first_grading_keys_read_own ON public.verified_first_grading_keys;
CREATE POLICY verified_first_grading_keys_read_own
  ON public.verified_first_grading_keys
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS verified_first_grading_keys_insert_own ON public.verified_first_grading_keys;
CREATE POLICY verified_first_grading_keys_insert_own
  ON public.verified_first_grading_keys
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS verified_first_grading_keys_service_role_all ON public.verified_first_grading_keys;
CREATE POLICY verified_first_grading_keys_service_role_all
  ON public.verified_first_grading_keys
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

-- Backfill legacy rows as full credit / zero.
UPDATE public.verified_first_attempts
SET accuracy_pct = CASE WHEN is_correct THEN 1.0 ELSE 0.0 END;

UPDATE public.verified_first_attempts
SET attempt_format = 'mcq'
WHERE attempt_format IS NULL OR attempt_format = '';

CREATE OR REPLACE FUNCTION public.upsert_student_node_rolling_from_vfa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_weight numeric := CASE
    WHEN NEW.attempt_format IN ('free_response', 'multi_part_part') THEN 1.5
    ELSE 1.0
  END;
  v_points numeric := COALESCE(NEW.accuracy_pct, CASE WHEN NEW.is_correct THEN 1 ELSE 0 END) * 100.0;
BEGIN
  INSERT INTO public.student_node_rolling_stats (
    user_id,
    skill_node_id,
    rolling_accuracy,
    attempts_in_window,
    last_updated
  )
  VALUES (
    NEW.user_id,
    NEW.skill_node_id,
    v_points,
    v_weight,
    now()
  )
  ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
    attempts_in_window = public.student_node_rolling_stats.attempts_in_window + v_weight,
    rolling_accuracy = ROUND(
      (
        public.student_node_rolling_stats.rolling_accuracy
          * public.student_node_rolling_stats.attempts_in_window
        + v_points * v_weight
      ) / (public.student_node_rolling_stats.attempts_in_window + v_weight),
      2
    ),
    last_updated = now();

  RETURN NEW;
END;
$$;

-- Rank cache uses per-node accuracy_pct averages (partial credit counts proportionally).
CREATE OR REPLACE FUNCTION public.refresh_ap_calc_verified_rank_cache()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  WITH user_accuracy AS (
    SELECT
      vfa.user_id,
      COUNT(*)::bigint AS attempt_count,
      ROUND(
        (AVG(COALESCE(vfa.accuracy_pct, CASE WHEN vfa.is_correct THEN 1 ELSE 0 END)) * 100.0)
      )::integer AS accuracy_pct
    FROM public.verified_first_attempts vfa
    GROUP BY vfa.user_id
  ),
  with_percentile AS (
    SELECT
      ua.user_id,
      ua.attempt_count,
      ua.accuracy_pct,
      CASE
        WHEN ua.attempt_count >= 5 THEN
          (CUME_DIST() OVER (ORDER BY ua.accuracy_pct) * 100)::numeric(6, 2)
      END AS pct_rank
    FROM user_accuracy ua
  )
  INSERT INTO public.ap_calc_verified_rank_cache (
    user_id,
    verified_count,
    accuracy_percent,
    percentile,
    updated_at
  )
  SELECT
    wp.user_id,
    wp.attempt_count,
    wp.accuracy_pct,
    wp.pct_rank,
    now()
  FROM with_percentile wp
  ON CONFLICT (user_id) DO UPDATE SET
    verified_count = EXCLUDED.verified_count,
    accuracy_percent = EXCLUDED.accuracy_percent,
    percentile = EXCLUDED.percentile,
    updated_at = EXCLUDED.updated_at;

  DELETE FROM public.ap_calc_verified_rank_cache c
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.verified_first_attempts v
    WHERE v.user_id = c.user_id
  );
END;
$$;

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
        (AVG(COALESCE(vfa.accuracy_pct, CASE WHEN vfa.is_correct THEN 1 ELSE 0 END)) * 100.0)
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
