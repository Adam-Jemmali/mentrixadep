-- Production cleanup (idempotent): drop privacy / orphan tables if still present.
-- Live check 2026-07-17: telemetry_logs, student_diagnostic_profiles, session_bundles
-- already absent (PGRST205). duel_queue retained — live matchmaking (0 rows last 30d,
-- but src/features/duels still writes via duel_queue_join_and_match).
--
-- Also re-asserts peer snapshot sync uses UPSERT (never TRUNCATE).

DROP TABLE IF EXISTS public.telemetry_logs CASCADE;
DROP TABLE IF EXISTS public.student_diagnostic_profiles CASCADE;
DROP TABLE IF EXISTS public.session_bundles CASCADE;

CREATE OR REPLACE FUNCTION public.sync_node_percentile_snapshot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.node_percentile_snapshot (
    skill_node_id,
    accuracy_bucket,
    user_count,
    computed_at
  )
  SELECT
    vfa.skill_node_id,
    public.accuracy_to_percentile_bucket(
      COALESCE(vfa.accuracy_pct, CASE WHEN vfa.is_correct THEN 1.0 ELSE 0.0 END) * 100.0
    ),
    COUNT(DISTINCT vfa.user_id)::integer,
    v_now
  FROM public.verified_first_attempts vfa
  GROUP BY
    vfa.skill_node_id,
    public.accuracy_to_percentile_bucket(
      COALESCE(vfa.accuracy_pct, CASE WHEN vfa.is_correct THEN 1.0 ELSE 0.0 END) * 100.0
    )
  ON CONFLICT (skill_node_id, accuracy_bucket)
  DO UPDATE SET
    user_count = EXCLUDED.user_count,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.node_percentile_snapshot
  WHERE computed_at < v_now;

  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_guide_impact_percentile_snapshot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
  v_now timestamptz := now();
BEGIN
  INSERT INTO public.guide_impact_percentile_snapshot (
    skill_node_id,
    accuracy_bucket,
    user_count,
    computed_at
  )
  SELECT
    gnir.skill_node_id,
    public.accuracy_to_percentile_bucket(gnir.post_session_accuracy_avg),
    COUNT(DISTINCT gnir.guide_id)::integer,
    v_now
  FROM public.guide_node_impact_rolling gnir
  WHERE gnir.sessions_counted > 0
  GROUP BY
    gnir.skill_node_id,
    public.accuracy_to_percentile_bucket(gnir.post_session_accuracy_avg)
  ON CONFLICT (skill_node_id, accuracy_bucket)
  DO UPDATE SET
    user_count = EXCLUDED.user_count,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;

  DELETE FROM public.guide_impact_percentile_snapshot
  WHERE computed_at < v_now;

  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.sync_node_percentile_snapshot IS
  'UPSERT node accuracy buckets from VFA; prune stale. Never TRUNCATE.';

COMMENT ON FUNCTION public.sync_guide_impact_percentile_snapshot IS
  'UPSERT guide impact buckets from GNIR; prune stale. Never TRUNCATE.';
