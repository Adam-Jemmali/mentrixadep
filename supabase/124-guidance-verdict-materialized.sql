-- PROMPT 003: Materialized state for the Verdict Engine (incremental upserts, no live history scans).
-- Run after 123-auto-approve-guides.sql

-- ─── student_node_rolling_stats ───────────────────────────────────────────────
-- O(1) upsert per practice attempt (knowledge graph) and verified first attempt insert.

CREATE TABLE IF NOT EXISTS public.student_node_rolling_stats (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  rolling_accuracy numeric(5, 2) NOT NULL DEFAULT 0,
  attempts_in_window integer NOT NULL DEFAULT 0 CHECK (attempts_in_window >= 0),
  last_updated timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_snrs_user_updated
  ON public.student_node_rolling_stats (user_id, last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_snrs_skill_node
  ON public.student_node_rolling_stats (skill_node_id);

ALTER TABLE public.student_node_rolling_stats ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS snrs_read_own ON public.student_node_rolling_stats;
CREATE POLICY snrs_read_own ON public.student_node_rolling_stats
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.student_node_rolling_stats IS
  'PROMPT 003: Incremental per-user per-node rolling accuracy for Verdict Engine quest_result. Updated on VFA insert and student_knowledge_nodes write.';

-- ─── guide_node_impact_rolling ────────────────────────────────────────────────
-- O(1) upsert per closed-loop post-session retest result.

CREATE TABLE IF NOT EXISTS public.guide_node_impact_rolling (
  guide_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  pre_session_accuracy_avg numeric(5, 2) NOT NULL DEFAULT 0,
  post_session_accuracy_avg numeric(5, 2) NOT NULL DEFAULT 0,
  sessions_counted integer NOT NULL DEFAULT 0 CHECK (sessions_counted >= 0),
  last_updated timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (guide_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_gnir_guide_updated
  ON public.guide_node_impact_rolling (guide_id, last_updated DESC);

CREATE INDEX IF NOT EXISTS idx_gnir_guide_post_accuracy
  ON public.guide_node_impact_rolling (guide_id, post_session_accuracy_avg DESC);

ALTER TABLE public.guide_node_impact_rolling ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS gnir_read_own ON public.guide_node_impact_rolling;
CREATE POLICY gnir_read_own ON public.guide_node_impact_rolling
  FOR SELECT USING (auth.uid() = guide_id);

COMMENT ON TABLE public.guide_node_impact_rolling IS
  'PROMPT 003: Incremental per-Guide per-node pre/post session accuracy for Verdict Engine impact_score. Updated when post-session retest lands.';

-- ─── Incremental writers (SECURITY DEFINER; service role / triggers only) ─────

CREATE OR REPLACE FUNCTION public.upsert_student_node_rolling_from_vfa()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_points numeric := CASE WHEN NEW.is_correct THEN 100 ELSE 0 END;
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
    1,
    now()
  )
  ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
    attempts_in_window = public.student_node_rolling_stats.attempts_in_window + 1,
    rolling_accuracy = ROUND(
      (
        public.student_node_rolling_stats.rolling_accuracy
          * public.student_node_rolling_stats.attempts_in_window
        + v_points
      ) / (public.student_node_rolling_stats.attempts_in_window + 1),
      2
    ),
    last_updated = now();

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_student_node_rolling_from_kg()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_accuracy numeric(5, 2);
BEGIN
  IF NEW.skill_node_id IS NULL OR COALESCE(NEW.attempts, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE'
     AND NEW.attempts IS NOT DISTINCT FROM OLD.attempts
     AND NEW.correct IS NOT DISTINCT FROM OLD.correct THEN
    RETURN NEW;
  END IF;

  v_accuracy := ROUND(
    (NEW.correct::numeric * 100.0) / NULLIF(NEW.attempts, 0),
    2
  );

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
    v_accuracy,
    NEW.attempts,
    now()
  )
  ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
    rolling_accuracy = EXCLUDED.rolling_accuracy,
    attempts_in_window = EXCLUDED.attempts_in_window,
    last_updated = EXCLUDED.last_updated;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.upsert_guide_node_impact_rolling_from_retest()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_guide_id uuid;
  v_pre_points numeric;
  v_post_points numeric;
BEGIN
  IF NEW.post_session_checked_at IS NULL OR NEW.post_session_correct IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.post_session_checked_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  SELECT s.tutor_id
  INTO v_guide_id
  FROM public.sessions s
  WHERE s.id = NEW.session_id;

  IF v_guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_pre_points := CASE WHEN NEW.pre_session_correct IS TRUE THEN 100 ELSE 0 END;
  v_post_points := CASE WHEN NEW.post_session_correct IS TRUE THEN 100 ELSE 0 END;

  INSERT INTO public.guide_node_impact_rolling (
    guide_id,
    skill_node_id,
    pre_session_accuracy_avg,
    post_session_accuracy_avg,
    sessions_counted,
    last_updated
  )
  VALUES (
    v_guide_id,
    NEW.skill_node_id,
    v_pre_points,
    v_post_points,
    1,
    now()
  )
  ON CONFLICT (guide_id, skill_node_id) DO UPDATE SET
    sessions_counted = public.guide_node_impact_rolling.sessions_counted + 1,
    pre_session_accuracy_avg = ROUND(
      (
        public.guide_node_impact_rolling.pre_session_accuracy_avg
          * public.guide_node_impact_rolling.sessions_counted
        + v_pre_points
      ) / (public.guide_node_impact_rolling.sessions_counted + 1),
      2
    ),
    post_session_accuracy_avg = ROUND(
      (
        public.guide_node_impact_rolling.post_session_accuracy_avg
          * public.guide_node_impact_rolling.sessions_counted
        + v_post_points
      ) / (public.guide_node_impact_rolling.sessions_counted + 1),
      2
    ),
    last_updated = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS verified_first_attempts_snrs_upsert ON public.verified_first_attempts;
CREATE TRIGGER verified_first_attempts_snrs_upsert
  AFTER INSERT ON public.verified_first_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_student_node_rolling_from_vfa();

DROP TRIGGER IF EXISTS student_knowledge_nodes_snrs_sync ON public.student_knowledge_nodes;
CREATE TRIGGER student_knowledge_nodes_snrs_sync
  AFTER INSERT OR UPDATE ON public.student_knowledge_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_student_node_rolling_from_kg();

DROP TRIGGER IF EXISTS session_target_nodes_gnir_upsert ON public.session_target_nodes;
CREATE TRIGGER session_target_nodes_gnir_upsert
  AFTER INSERT OR UPDATE ON public.session_target_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_guide_node_impact_rolling_from_retest();

-- ─── Backfill from existing aggregates (one-time; writes only) ─────────────────

INSERT INTO public.student_node_rolling_stats (
  user_id,
  skill_node_id,
  rolling_accuracy,
  attempts_in_window,
  last_updated
)
SELECT
  skn.user_id,
  skn.skill_node_id,
  ROUND((skn.correct::numeric * 100.0) / NULLIF(skn.attempts, 0), 2),
  skn.attempts,
  COALESCE(skn.updated_at, skn.last_seen_at, now())
FROM public.student_knowledge_nodes skn
WHERE skn.skill_node_id IS NOT NULL
  AND skn.attempts > 0
ON CONFLICT (user_id, skill_node_id) DO UPDATE SET
  rolling_accuracy = EXCLUDED.rolling_accuracy,
  attempts_in_window = EXCLUDED.attempts_in_window,
  last_updated = GREATEST(
    public.student_node_rolling_stats.last_updated,
    EXCLUDED.last_updated
  );

INSERT INTO public.student_node_rolling_stats (
  user_id,
  skill_node_id,
  rolling_accuracy,
  attempts_in_window,
  last_updated
)
SELECT
  vfa.user_id,
  vfa.skill_node_id,
  CASE WHEN vfa.is_correct THEN 100 ELSE 0 END::numeric(5, 2),
  1,
  COALESCE(vfa.attempted_at, now())
FROM public.verified_first_attempts vfa
ON CONFLICT (user_id, skill_node_id) DO NOTHING;

INSERT INTO public.guide_node_impact_rolling (
  guide_id,
  skill_node_id,
  pre_session_accuracy_avg,
  post_session_accuracy_avg,
  sessions_counted,
  last_updated
)
SELECT
  agg.guide_id,
  agg.skill_node_id,
  agg.pre_session_accuracy_avg,
  agg.post_session_accuracy_avg,
  agg.sessions_counted,
  now()
FROM (
  SELECT
    s.tutor_id AS guide_id,
    stn.skill_node_id,
    ROUND(
      AVG(CASE WHEN stn.pre_session_correct IS TRUE THEN 100 ELSE 0 END),
      2
    ) AS pre_session_accuracy_avg,
    ROUND(
      AVG(CASE WHEN stn.post_session_correct IS TRUE THEN 100 ELSE 0 END),
      2
    ) AS post_session_accuracy_avg,
    COUNT(*)::integer AS sessions_counted
  FROM public.session_target_nodes stn
  INNER JOIN public.sessions s ON s.id = stn.session_id
  WHERE stn.post_session_checked_at IS NOT NULL
    AND stn.post_session_correct IS NOT NULL
  GROUP BY s.tutor_id, stn.skill_node_id
) agg
ON CONFLICT (guide_id, skill_node_id) DO UPDATE SET
  pre_session_accuracy_avg = EXCLUDED.pre_session_accuracy_avg,
  post_session_accuracy_avg = EXCLUDED.post_session_accuracy_avg,
  sessions_counted = EXCLUDED.sessions_counted,
  last_updated = EXCLUDED.last_updated;

-- ─── Verification RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_guidance_verdict_materialized()
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
  v_snrs_rls boolean;
  v_gnir_rls boolean;
  v_vfa_trigger boolean;
  v_kg_trigger boolean;
  v_retest_trigger boolean;
  v_snrs_unique boolean;
  v_gnir_unique boolean;
BEGIN
  SELECT c.relrowsecurity INTO v_snrs_rls
  FROM pg_class c
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'student_node_rolling_stats';

  RETURN QUERY SELECT
    'snrs_rls_enabled'::text,
    COALESCE(v_snrs_rls, false),
    CASE WHEN v_snrs_rls THEN 'RLS on student_node_rolling_stats' ELSE 'RLS missing' END;

  SELECT c.relrowsecurity INTO v_gnir_rls
  FROM pg_class c
  INNER JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relname = 'guide_node_impact_rolling';

  RETURN QUERY SELECT
    'gnir_rls_enabled'::text,
    COALESCE(v_gnir_rls, false),
    CASE WHEN v_gnir_rls THEN 'RLS on guide_node_impact_rolling' ELSE 'RLS missing' END;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'verified_first_attempts'
      AND t.tgname = 'verified_first_attempts_snrs_upsert'
      AND NOT t.tgisinternal
  ) INTO v_vfa_trigger;

  RETURN QUERY SELECT
    'vfa_snrs_trigger'::text,
    v_vfa_trigger,
    CASE WHEN v_vfa_trigger THEN 'present' ELSE 'missing' END;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'student_knowledge_nodes'
      AND t.tgname = 'student_knowledge_nodes_snrs_sync'
      AND NOT t.tgisinternal
  ) INTO v_kg_trigger;

  RETURN QUERY SELECT
    'kg_snrs_trigger'::text,
    v_kg_trigger,
    CASE WHEN v_kg_trigger THEN 'present' ELSE 'missing' END;

  SELECT EXISTS (
    SELECT 1 FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'session_target_nodes'
      AND t.tgname = 'session_target_nodes_gnir_upsert'
      AND NOT t.tgisinternal
  ) INTO v_retest_trigger;

  RETURN QUERY SELECT
    'retest_gnir_trigger'::text,
    v_retest_trigger,
    CASE WHEN v_retest_trigger THEN 'present' ELSE 'missing' END;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    INNER JOIN pg_class t ON t.oid = c.conrelid
    INNER JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'student_node_rolling_stats'
      AND c.contype IN ('p', 'u')
  ) INTO v_snrs_unique;

  RETURN QUERY SELECT
    'snrs_primary_key'::text,
    v_snrs_unique,
    CASE WHEN v_snrs_unique THEN 'PRIMARY KEY (user_id, skill_node_id)' ELSE 'missing key' END;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    INNER JOIN pg_class t ON t.oid = c.conrelid
    INNER JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'guide_node_impact_rolling'
      AND c.contype IN ('p', 'u')
  ) INTO v_gnir_unique;

  RETURN QUERY SELECT
    'gnir_primary_key'::text,
    v_gnir_unique,
    CASE WHEN v_gnir_unique THEN 'PRIMARY KEY (guide_id, skill_node_id)' ELSE 'missing key' END;
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_guidance_verdict_materialized() TO authenticated;
GRANT EXECUTE ON FUNCTION public.verify_guidance_verdict_materialized() TO service_role;
