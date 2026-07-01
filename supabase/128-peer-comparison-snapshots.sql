-- PROMPT 007: Peer comparison snapshots (computed on schedule, never live).
-- Run after 127-user-notifications.sql

-- ─── Student verified distribution per skill node ─────────────────────────────

CREATE TABLE IF NOT EXISTS public.node_percentile_snapshot (
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  accuracy_bucket integer NOT NULL CHECK (accuracy_bucket >= 0 AND accuracy_bucket <= 90),
  user_count integer NOT NULL DEFAULT 0 CHECK (user_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (skill_node_id, accuracy_bucket)
);

CREATE INDEX IF NOT EXISTS idx_node_percentile_snapshot_computed
  ON public.node_percentile_snapshot (computed_at DESC);

ALTER TABLE public.node_percentile_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS node_percentile_snapshot_read ON public.node_percentile_snapshot;
CREATE POLICY node_percentile_snapshot_read ON public.node_percentile_snapshot
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.node_percentile_snapshot IS
  'PROMPT 007: Ten-point accuracy buckets of verified_first_attempts per node. Refreshed by cron, never live-joined.';

-- ─── Guide post-session impact distribution per skill node ────────────────────

CREATE TABLE IF NOT EXISTS public.guide_impact_percentile_snapshot (
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  accuracy_bucket integer NOT NULL CHECK (accuracy_bucket >= 0 AND accuracy_bucket <= 90),
  user_count integer NOT NULL DEFAULT 0 CHECK (user_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (skill_node_id, accuracy_bucket)
);

CREATE INDEX IF NOT EXISTS idx_guide_impact_percentile_snapshot_computed
  ON public.guide_impact_percentile_snapshot (computed_at DESC);

ALTER TABLE public.guide_impact_percentile_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_impact_percentile_snapshot_read ON public.guide_impact_percentile_snapshot;
CREATE POLICY guide_impact_percentile_snapshot_read ON public.guide_impact_percentile_snapshot
  FOR SELECT USING (auth.role() = 'authenticated');

COMMENT ON TABLE public.guide_impact_percentile_snapshot IS
  'PROMPT 007: Ten-point post-session accuracy buckets per node from guide_node_impact_rolling. Refreshed by cron.';

-- ─── Bucket helper (0, 10, …, 90) ───────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.accuracy_to_percentile_bucket(p_accuracy numeric)
RETURNS integer
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN p_accuracy IS NULL THEN 0
    WHEN p_accuracy >= 100 THEN 90
    WHEN p_accuracy < 0 THEN 0
    ELSE LEAST(90, (FLOOR(p_accuracy / 10) * 10)::integer)
  END;
$$;

-- ─── Snapshot refresh (hourly-capable; Vercel cron invokes daily) ─────────────

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
  TRUNCATE public.node_percentile_snapshot;

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
    );

  GET DIAGNOSTICS v_rows = ROW_COUNT;
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
  TRUNCATE public.guide_impact_percentile_snapshot;

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
    public.accuracy_to_percentile_bucket(gnir.post_session_accuracy_avg);

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_peer_comparison_snapshots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_rows integer;
  v_guide_rows integer;
BEGIN
  v_node_rows := public.sync_node_percentile_snapshot();
  v_guide_rows := public.sync_guide_impact_percentile_snapshot();

  RETURN jsonb_build_object(
    'node_rows', v_node_rows,
    'guide_rows', v_guide_rows,
    'computed_at', now()
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.sync_node_percentile_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_guide_impact_percentile_snapshot() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_peer_comparison_snapshots() TO service_role;

-- ─── Comparison sentence (min sample 10; suppressed below) ───────────────────

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
      'Better than %s%% of Guides teaching this node.',
      v_percent
    );
  END IF;

  SELECT CASE WHEN vfa.is_correct THEN 100 ELSE 0 END::numeric
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
    'Better than %s%% of everyone verified on this node.',
    v_percent
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_comparison_context(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_comparison_context(uuid, uuid, text) TO service_role;

COMMENT ON FUNCTION public.get_comparison_context IS
  'PROMPT 007: Returns one comparison sentence or NULL when sample size < 10 or actor has no node accuracy.';

CREATE OR REPLACE FUNCTION public.verify_peer_comparison_snapshots()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_node_rows bigint;
  v_guide_rows bigint;
BEGIN
  SELECT COUNT(*) INTO v_node_rows FROM public.node_percentile_snapshot;
  SELECT COUNT(*) INTO v_guide_rows FROM public.guide_impact_percentile_snapshot;

  RETURN jsonb_build_object(
    'node_bucket_rows', v_node_rows,
    'guide_bucket_rows', v_guide_rows,
    'get_comparison_context_exists', EXISTS (
      SELECT 1
      FROM pg_proc p
      INNER JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public'
        AND p.proname = 'get_comparison_context'
    )
  );
END;
$$;
