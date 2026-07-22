-- Return real eligible cohort size with peer rank (no invented "of 100" copy).
-- Postgres requires DROP when OUT/return columns change (42P13).
DROP FUNCTION IF EXISTS public.get_verified_first_attempt_rank(uuid);

CREATE FUNCTION public.get_verified_first_attempt_rank(p_user_id uuid)
RETURNS TABLE (
  verified_count bigint,
  accuracy_percent integer,
  percentile numeric,
  eligible_cohort_size bigint
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
  cohort AS (
    SELECT COUNT(*)::bigint AS cohort_size FROM eligible
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
    r.pct_rank,
    c.cohort_size
  FROM cohort c
  LEFT JOIN user_accuracy ua ON ua.user_id = p_user_id
  LEFT JOIN ranked r ON r.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO service_role;
