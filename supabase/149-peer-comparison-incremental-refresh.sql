-- PROMPT 015 (Sprint 4): Incremental peer comparison refresh — no TRUNCATE table locks.
-- Run after 148-live-board-realtime.sql
--
-- node_percentile_snapshot and guide_impact_percentile_snapshot already have
-- PRIMARY KEY (skill_node_id, accuracy_bucket) from 128-peer-comparison-snapshots.sql.

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
      CASE WHEN vfa.is_correct THEN 100 ELSE 0 END::numeric
    ),
    COUNT(DISTINCT vfa.user_id)::integer,
    v_now
  FROM public.verified_first_attempts vfa
  GROUP BY
    vfa.skill_node_id,
    public.accuracy_to_percentile_bucket(
      CASE WHEN vfa.is_correct THEN 100 ELSE 0 END::numeric
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
  'Upserts node accuracy buckets from verified_first_attempts; prunes stale buckets. No TRUNCATE.';

COMMENT ON FUNCTION public.sync_guide_impact_percentile_snapshot IS
  'Upserts guide impact buckets from guide_node_impact_rolling; prunes stale buckets. No TRUNCATE.';
