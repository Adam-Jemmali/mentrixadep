-- PROMPT 006: AP Calculus AB calibrated rank cache (accuracy + percentile).
-- Materialized on every verified_first_attempts insert; page loads read one row.
-- Run after 116-verified-first-attempt-verify.sql

CREATE TABLE IF NOT EXISTS public.ap_calc_verified_rank_cache (
  user_id uuid PRIMARY KEY REFERENCES public.users (id) ON DELETE CASCADE,
  verified_count bigint NOT NULL DEFAULT 0,
  accuracy_percent integer NOT NULL DEFAULT 0,
  percentile numeric(6, 2),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ap_calc_verified_rank_cache_updated
  ON public.ap_calc_verified_rank_cache (updated_at DESC);

ALTER TABLE public.ap_calc_verified_rank_cache ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ap_calc_verified_rank_read_own ON public.ap_calc_verified_rank_cache;
CREATE POLICY ap_calc_verified_rank_read_own ON public.ap_calc_verified_rank_cache
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.ap_calc_verified_rank_cache IS
  'PROMPT 006: Precomputed AP Calculus AB VFA accuracy and peer percentile (min 5 skills). Refreshed on each new verified_first_attempts row.';

COMMENT ON COLUMN public.ap_calc_verified_rank_cache.percentile IS
  'Share of eligible users (>=5 verified skills) with equal or lower first-attempt accuracy (CUME_DIST * 100). NULL until eligible.';

-- Rebuild entire cache from verified_first_attempts (write path only).
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
        (COUNT(*) FILTER (WHERE vfa.is_correct))::numeric * 100.0
        / NULLIF(COUNT(*), 0)
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

COMMENT ON FUNCTION public.refresh_ap_calc_verified_rank_cache IS
  'Recompute all AP Calc AB calibrated rank rows. Called by trigger on verified_first_attempts INSERT.';

GRANT EXECUTE ON FUNCTION public.refresh_ap_calc_verified_rank_cache() TO service_role;

CREATE OR REPLACE FUNCTION public.trg_refresh_ap_calc_verified_rank_cache()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_ap_calc_verified_rank_cache();
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS verified_first_attempts_refresh_rank_cache ON public.verified_first_attempts;
CREATE TRIGGER verified_first_attempts_refresh_rank_cache
  AFTER INSERT ON public.verified_first_attempts
  FOR EACH STATEMENT
  EXECUTE FUNCTION public.trg_refresh_ap_calc_verified_rank_cache();

-- Fast read path: single indexed row, no aggregate scan on page load.
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
  SELECT
    COALESCE(c.verified_count, 0::bigint),
    COALESCE(c.accuracy_percent, 0),
    c.percentile
  FROM (SELECT 1) AS _anchor
  LEFT JOIN public.ap_calc_verified_rank_cache c ON c.user_id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_verified_first_attempt_rank(uuid) TO service_role;

-- Backfill existing verified attempts.
SELECT public.refresh_ap_calc_verified_rank_cache();

CREATE OR REPLACE FUNCTION public.verify_ap_calc_verified_rank_cache()
RETURNS TABLE (
  check_name text,
  passed boolean,
  detail text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_trigger_exists boolean;
  v_cache_rows bigint;
  v_vfa_users bigint;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'verified_first_attempts'
      AND t.tgname = 'verified_first_attempts_refresh_rank_cache'
      AND NOT t.tgisinternal
  ) INTO v_trigger_exists;

  RETURN QUERY SELECT
    'insert_refresh_trigger'::text,
    v_trigger_exists,
    CASE WHEN v_trigger_exists THEN 'trigger present' ELSE 'missing trigger' END;

  SELECT COUNT(*)::bigint INTO v_cache_rows FROM public.ap_calc_verified_rank_cache;
  SELECT COUNT(DISTINCT user_id)::bigint INTO v_vfa_users FROM public.verified_first_attempts;

  RETURN QUERY SELECT
    'cache_covers_vfa_users'::text,
    v_cache_rows >= v_vfa_users OR v_vfa_users = 0,
    format('cache=%s distinct vfa users=%s', v_cache_rows, v_vfa_users);
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ap_calc_verified_rank_cache() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_ap_calc_verified_rank_cache() TO service_role;
