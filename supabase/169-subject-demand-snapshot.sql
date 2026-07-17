-- P#033 Subject demand snapshot for Guide home.
-- Prompt said 148; that file is live-board-realtime — use 169.
-- Refreshed lazily when Guide home loads if older than 1 hour. No cron.

CREATE TABLE IF NOT EXISTS public.subject_demand_snapshot (
  subject text NOT NULL,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  students_weak_count int NOT NULL DEFAULT 0 CHECK (students_weak_count >= 0),
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (subject, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_subject_demand_snapshot_weak
  ON public.subject_demand_snapshot (students_weak_count DESC, computed_at DESC);

ALTER TABLE public.subject_demand_snapshot ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subject_demand_snapshot_read ON public.subject_demand_snapshot;
CREATE POLICY subject_demand_snapshot_read ON public.subject_demand_snapshot
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS subject_demand_snapshot_service ON public.subject_demand_snapshot;
CREATE POLICY subject_demand_snapshot_service ON public.subject_demand_snapshot
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.subject_demand_snapshot IS
  'Platform weak-student counts per skill node. One shared refresh serves every Guide.';

CREATE OR REPLACE FUNCTION public.sync_subject_demand_snapshot()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rows integer;
BEGIN
  WITH weak AS (
    SELECT
      skn.skill_node_id,
      COUNT(DISTINCT skn.user_id)::integer AS students_weak_count
    FROM public.student_knowledge_nodes skn
    WHERE skn.skill_node_id IS NOT NULL
      AND skn.attempts > 0
      AND (skn.correct::numeric / skn.attempts) < 0.7
    GROUP BY skn.skill_node_id
  )
  INSERT INTO public.subject_demand_snapshot (
    subject,
    skill_node_id,
    students_weak_count,
    computed_at
  )
  SELECT
    sn.subject,
    sn.id,
    COALESCE(w.students_weak_count, 0),
    now()
  FROM public.skill_nodes sn
  LEFT JOIN weak w ON w.skill_node_id = sn.id
  ON CONFLICT (subject, skill_node_id) DO UPDATE SET
    students_weak_count = EXCLUDED.students_weak_count,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.sync_subject_demand_snapshot IS
  'Upsert weak student counts from knowledge nodes. Called on stale Guide home load only.';

GRANT EXECUTE ON FUNCTION public.sync_subject_demand_snapshot() TO service_role;
