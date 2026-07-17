-- P#022 follow-up: peer comparison buckets use VFA accuracy_pct (0–1 → 0–100).
-- Tables + get_comparison_context live in 128; UPSERT refresh in 149.
-- Do not recreate as 141 (that number is movement receipts).

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

CREATE OR REPLACE FUNCTION public.get_comparison_context(
  p_actor_id uuid,
  p_skill_node_id uuid,
  p_actor_kind text DEFAULT 'student'
)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_accuracy numeric;
  v_actor_bucket integer;
  v_total bigint;
  v_below bigint;
  v_percent integer;
  v_min_sample constant integer := 10;
BEGIN
  IF p_actor_id IS NULL OR p_skill_node_id IS NULL THEN
    RETURN NULL;
  END IF;

  IF p_actor_kind = 'guide' THEN
    SELECT gnir.post_session_accuracy_avg
    INTO v_actor_accuracy
    FROM public.guide_node_impact_rolling gnir
    WHERE gnir.guide_id = p_actor_id
      AND gnir.skill_node_id = p_skill_node_id
      AND gnir.sessions_counted > 0;

    IF v_actor_accuracy IS NULL THEN
      RETURN NULL;
    END IF;

    v_actor_bucket := public.accuracy_to_percentile_bucket(v_actor_accuracy);

    SELECT COALESCE(SUM(gips.user_count), 0)
    INTO v_total
    FROM public.guide_impact_percentile_snapshot gips
    WHERE gips.skill_node_id = p_skill_node_id;

    IF v_total < v_min_sample THEN
      RETURN NULL;
    END IF;

    SELECT COALESCE(SUM(gips.user_count), 0)
    INTO v_below
    FROM public.guide_impact_percentile_snapshot gips
    WHERE gips.skill_node_id = p_skill_node_id
      AND gips.accuracy_bucket < v_actor_bucket;

    v_percent := ROUND((v_below::numeric * 100.0) / v_total)::integer;

    RETURN format(
      'Better than %s percent of Guides teaching this node.',
      v_percent
    );
  END IF;

  SELECT
    COALESCE(vfa.accuracy_pct, CASE WHEN vfa.is_correct THEN 1.0 ELSE 0.0 END) * 100.0
  INTO v_actor_accuracy
  FROM public.verified_first_attempts vfa
  WHERE vfa.user_id = p_actor_id
    AND vfa.skill_node_id = p_skill_node_id;

  IF v_actor_accuracy IS NULL THEN
    RETURN NULL;
  END IF;

  v_actor_bucket := public.accuracy_to_percentile_bucket(v_actor_accuracy);

  SELECT COALESCE(SUM(nps.user_count), 0)
  INTO v_total
  FROM public.node_percentile_snapshot nps
  WHERE nps.skill_node_id = p_skill_node_id;

  IF v_total < v_min_sample THEN
    RETURN NULL;
  END IF;

  SELECT COALESCE(SUM(nps.user_count), 0)
  INTO v_below
  FROM public.node_percentile_snapshot nps
  WHERE nps.skill_node_id = p_skill_node_id
    AND nps.accuracy_bucket < v_actor_bucket;

  v_percent := ROUND((v_below::numeric * 100.0) / v_total)::integer;

  RETURN format(
    'Better than %s percent of everyone verified on this node.',
    v_percent
  );
END;
$$;

COMMENT ON FUNCTION public.get_comparison_context IS
  'P#022: Snapshot-only peer sentence; NULL when sample size < 10. Never live-joins VFA aggregates.';
