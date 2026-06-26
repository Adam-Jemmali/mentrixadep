-- Weekly platform demand signal: students below 70% accuracy per skill node.
-- Run after 119-guide-impact-by-node.sql

CREATE TABLE IF NOT EXISTS public.skill_node_weekly_demand (
  week_start date NOT NULL,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  subject text NOT NULL,
  node_name text NOT NULL,
  weak_student_count integer NOT NULL DEFAULT 0,
  computed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (week_start, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_node_weekly_demand_week_count
  ON public.skill_node_weekly_demand (week_start, weak_student_count DESC);

ALTER TABLE public.skill_node_weekly_demand ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_node_weekly_demand_read ON public.skill_node_weekly_demand;
CREATE POLICY skill_node_weekly_demand_read ON public.skill_node_weekly_demand
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS skill_node_weekly_demand_service ON public.skill_node_weekly_demand;
CREATE POLICY skill_node_weekly_demand_service ON public.skill_node_weekly_demand
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.skill_node_weekly_demand IS
  'Weekly snapshot of students below 70% accuracy per skill node. Refreshed by Monday cron; never computed on Guide home load.';

CREATE OR REPLACE FUNCTION public.utc_week_start_monday(p_when timestamptz DEFAULT now())
RETURNS date
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT (
    (p_when AT TIME ZONE 'UTC')::date
    - ((EXTRACT(DOW FROM (p_when AT TIME ZONE 'UTC')::date)::int + 6) % 7)
  )::date;
$$;

CREATE OR REPLACE FUNCTION public.sync_skill_node_weekly_demand()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_week_start date;
  v_rows integer;
BEGIN
  v_week_start := public.utc_week_start_monday(now());

  WITH weak_students AS (
    SELECT vfa.skill_node_id, vfa.user_id
    FROM public.verified_first_attempts vfa
    WHERE vfa.is_correct = false
    UNION
    SELECT skn.skill_node_id, skn.user_id
    FROM public.student_knowledge_nodes skn
    WHERE skn.skill_node_id IS NOT NULL
      AND skn.attempts > 0
      AND (skn.correct::numeric / NULLIF(skn.attempts, 0)) < 0.7
      AND NOT EXISTS (
        SELECT 1
        FROM public.verified_first_attempts vfa2
        WHERE vfa2.user_id = skn.user_id
          AND vfa2.skill_node_id = skn.skill_node_id
      )
  ),
  aggregated AS (
    SELECT
      sn.id AS skill_node_id,
      sn.subject,
      sn.node_name,
      COUNT(ws.user_id)::integer AS weak_student_count
    FROM public.skill_nodes sn
    LEFT JOIN weak_students ws ON ws.skill_node_id = sn.id
    GROUP BY sn.id, sn.subject, sn.node_name
  )
  INSERT INTO public.skill_node_weekly_demand (
    week_start,
    skill_node_id,
    subject,
    node_name,
    weak_student_count,
    computed_at
  )
  SELECT
    v_week_start,
    skill_node_id,
    subject,
    node_name,
    weak_student_count,
    now()
  FROM aggregated
  ON CONFLICT (week_start, skill_node_id) DO UPDATE SET
    subject = EXCLUDED.subject,
    node_name = EXCLUDED.node_name,
    weak_student_count = EXCLUDED.weak_student_count,
    computed_at = EXCLUDED.computed_at;

  GET DIAGNOSTICS v_rows = ROW_COUNT;
  RETURN v_rows;
END;
$$;

COMMENT ON FUNCTION public.sync_skill_node_weekly_demand IS
  'Upsert weekly weak-student counts per skill node (Monday UTC week). Called by weekly cron only.';

GRANT EXECUTE ON FUNCTION public.utc_week_start_monday(timestamptz) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.sync_skill_node_weekly_demand() TO service_role;
