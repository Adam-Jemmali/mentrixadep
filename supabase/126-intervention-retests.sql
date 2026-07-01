-- PROMPT 005: Universal retest scheduling for every claimed intervention.
-- Run after 125-user-settings-last-seen-state.sql

-- ─── intervention_retests ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.intervention_retests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_type text NOT NULL CHECK (
    source_type IN ('studio_package', 'session', 'breakthrough', 'duel_loss')
  ),
  source_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  scheduled_for timestamptz NOT NULL,
  completed_at timestamptz,
  pre_accuracy numeric(5, 2),
  post_accuracy numeric(5, 2),
  delta numeric(6, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT intervention_retests_source_node_unique
    UNIQUE (source_type, source_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_intervention_retests_user_due
  ON public.intervention_retests (user_id, scheduled_for)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intervention_retests_user_node_open
  ON public.intervention_retests (user_id, skill_node_id)
  WHERE completed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intervention_retests_source
  ON public.intervention_retests (source_type, source_id);

ALTER TABLE public.intervention_retests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intervention_retests_read_own ON public.intervention_retests;
CREATE POLICY intervention_retests_read_own ON public.intervention_retests
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.intervention_retests IS
  'PROMPT 005: Closed-loop retest schedule per intervention (studio publish, session, breakthrough, duel loss).';

-- Guide impact now flows through intervention completion; session_target_nodes stays for guarantee UI only.
DROP TRIGGER IF EXISTS session_target_nodes_gnir_upsert ON public.session_target_nodes;

-- ─── Retest completion (fires on verified or practice attempt after scheduled_for) ─

CREATE OR REPLACE FUNCTION public.complete_due_intervention_retests(
  p_user_id uuid,
  p_skill_node_id uuid,
  p_post_accuracy numeric
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_skill_node_id IS NULL OR p_post_accuracy IS NULL THEN
    RETURN;
  END IF;

  UPDATE public.intervention_retests ir
  SET
    post_accuracy = ROUND(p_post_accuracy, 2),
    delta = ROUND(
      p_post_accuracy - COALESCE(ir.pre_accuracy, 0),
      2
    ),
    completed_at = now()
  WHERE ir.user_id = p_user_id
    AND ir.skill_node_id = p_skill_node_id
    AND ir.completed_at IS NULL
    AND ir.scheduled_for <= now();
END;
$$;

CREATE OR REPLACE FUNCTION public.verified_first_attempts_complete_intervention_retests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post numeric;
BEGIN
  v_post := CASE WHEN NEW.is_correct THEN 100 ELSE 0 END;
  PERFORM public.complete_due_intervention_retests(
    NEW.user_id,
    NEW.skill_node_id,
    v_post
  );
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.student_knowledge_nodes_complete_intervention_retests()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_post numeric(5, 2);
BEGIN
  IF NEW.skill_node_id IS NULL OR COALESCE(NEW.attempts, 0) <= 0 THEN
    RETURN NEW;
  END IF;

  v_post := ROUND((NEW.correct::numeric * 100.0) / NEW.attempts, 2);

  PERFORM public.complete_due_intervention_retests(
    NEW.user_id,
    NEW.skill_node_id,
    v_post
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS zzz_verified_first_attempts_ir_complete ON public.verified_first_attempts;
CREATE TRIGGER zzz_verified_first_attempts_ir_complete
  AFTER INSERT ON public.verified_first_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.verified_first_attempts_complete_intervention_retests();

DROP TRIGGER IF EXISTS zzz_student_knowledge_nodes_ir_complete ON public.student_knowledge_nodes;
CREATE TRIGGER zzz_student_knowledge_nodes_ir_complete
  AFTER INSERT OR UPDATE ON public.student_knowledge_nodes
  FOR EACH ROW
  EXECUTE FUNCTION public.student_knowledge_nodes_complete_intervention_retests();

-- ─── Guide impact closed loop (studio_package + session interventions only) ─────

CREATE OR REPLACE FUNCTION public.upsert_guide_impact_from_intervention_retest()
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
  IF NEW.completed_at IS NULL OR NEW.post_accuracy IS NULL THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' AND OLD.completed_at IS NOT NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.source_type NOT IN ('studio_package', 'session') THEN
    RETURN NEW;
  END IF;

  SELECT s.tutor_id
  INTO v_guide_id
  FROM public.sessions s
  WHERE s.id = NEW.source_id;

  IF v_guide_id IS NULL THEN
    RETURN NEW;
  END IF;

  v_pre_points := COALESCE(NEW.pre_accuracy, 0);
  v_post_points := COALESCE(NEW.post_accuracy, 0);

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

DROP TRIGGER IF EXISTS intervention_retests_gnir_upsert ON public.intervention_retests;
CREATE TRIGGER intervention_retests_gnir_upsert
  AFTER INSERT OR UPDATE ON public.intervention_retests
  FOR EACH ROW
  EXECUTE FUNCTION public.upsert_guide_impact_from_intervention_retest();

-- ─── Backfill open studio/session retests from session_target_nodes ───────────

INSERT INTO public.intervention_retests (
  source_type,
  source_id,
  user_id,
  skill_node_id,
  scheduled_for,
  pre_accuracy,
  completed_at,
  post_accuracy,
  delta
)
SELECT
  CASE
    WHEN sap.package_published_at IS NOT NULL THEN 'studio_package'
    ELSE 'session'
  END AS source_type,
  stn.session_id AS source_id,
  s.student_id,
  stn.skill_node_id,
  COALESCE(stn.retest_scheduled_at, now()),
  snrs.rolling_accuracy,
  stn.post_session_checked_at,
  CASE
    WHEN stn.post_session_correct IS TRUE THEN 100
    WHEN stn.post_session_correct IS FALSE THEN 0
    ELSE NULL
  END,
  CASE
    WHEN stn.post_session_checked_at IS NOT NULL AND stn.post_session_correct IS NOT NULL THEN
      (CASE WHEN stn.post_session_correct IS TRUE THEN 100 ELSE 0 END)
      - COALESCE(snrs.rolling_accuracy, 0)
    ELSE NULL
  END
FROM public.session_target_nodes stn
INNER JOIN public.sessions s ON s.id = stn.session_id
LEFT JOIN public.session_ai_packages sap ON sap.session_id = stn.session_id
LEFT JOIN public.student_node_rolling_stats snrs
  ON snrs.user_id = s.student_id
  AND snrs.skill_node_id = stn.skill_node_id
WHERE stn.retest_scheduled_at IS NOT NULL
ON CONFLICT (source_type, source_id, skill_node_id) DO NOTHING;

-- ─── Verification RPC ─────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.verify_intervention_retests()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_open bigint;
  v_completed bigint;
  v_gnir_trigger_exists boolean;
BEGIN
  SELECT COUNT(*) INTO v_open
  FROM public.intervention_retests
  WHERE completed_at IS NULL;

  SELECT COUNT(*) INTO v_completed
  FROM public.intervention_retests
  WHERE completed_at IS NOT NULL;

  SELECT EXISTS (
    SELECT 1
    FROM pg_trigger t
    INNER JOIN pg_class c ON c.oid = t.tgrelid
    WHERE c.relname = 'intervention_retests'
      AND t.tgname = 'intervention_retests_gnir_upsert'
      AND NOT t.tgisinternal
  ) INTO v_gnir_trigger_exists;

  RETURN jsonb_build_object(
    'open_retests', v_open,
    'completed_retests', v_completed,
    'gnir_trigger_active', v_gnir_trigger_exists,
    'session_target_gnir_trigger_removed', NOT EXISTS (
      SELECT 1
      FROM pg_trigger t
      INNER JOIN pg_class c ON c.oid = t.tgrelid
      WHERE c.relname = 'session_target_nodes'
        AND t.tgname = 'session_target_nodes_gnir_upsert'
        AND NOT t.tgisinternal
    )
  );
END;
$$;
