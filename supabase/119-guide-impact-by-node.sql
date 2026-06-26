-- PROMPT 011: Guide Impact Score per skill node from verified first attempts (post- vs pre-guide).
-- Run after 118-skill-node-exam-stakes.sql

CREATE TABLE IF NOT EXISTS public.guide_impact_node_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  node_name text NOT NULL,
  subject text NOT NULL,
  impact_score numeric(5, 2) NOT NULL DEFAULT 0,
  students_counted integer NOT NULL DEFAULT 0,
  after_accuracy numeric(5, 2) NOT NULL DEFAULT 0,
  before_accuracy numeric(5, 2) NOT NULL DEFAULT 0,
  impact_lift numeric(5, 2) NOT NULL DEFAULT 0,
  last_calculated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_guide_impact_node_scores_guide
  ON public.guide_impact_node_scores (guide_id);

CREATE INDEX IF NOT EXISTS idx_guide_impact_node_scores_guide_lift
  ON public.guide_impact_node_scores (guide_id, impact_lift DESC);

ALTER TABLE public.guide_impact_node_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS guide_impact_node_scores_read ON public.guide_impact_node_scores;
CREATE POLICY guide_impact_node_scores_read ON public.guide_impact_node_scores
  FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS guide_impact_node_scores_service ON public.guide_impact_node_scores;
CREATE POLICY guide_impact_node_scores_service ON public.guide_impact_node_scores
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.guide_impact_node_scores IS
  'Cached per-node Guide Impact from mv_guide_impact_by_node. Refreshed by daily cron, never computed on profile load.';

CREATE MATERIALIZED VIEW public.mv_guide_impact_by_node AS
WITH first_guide_session AS (
  SELECT
    s.tutor_id AS guide_id,
    s.student_id,
    MIN(s.end_time) AS first_session_end
  FROM public.sessions s
  WHERE s.status = 'completed'
    AND s.completed = true
  GROUP BY s.tutor_id, s.student_id
),
after_nodes AS (
  SELECT
    fgs.guide_id,
    vfa.skill_node_id,
    vfa.user_id,
    (CASE WHEN vfa.is_correct THEN 100 ELSE 0 END)::numeric AS accuracy
  FROM public.verified_first_attempts vfa
  INNER JOIN first_guide_session fgs ON fgs.student_id = vfa.user_id
  WHERE vfa.attempted_at > fgs.first_session_end
),
before_nodes AS (
  SELECT
    fgs.guide_id,
    vfa.user_id,
    (CASE WHEN vfa.is_correct THEN 100 ELSE 0 END)::numeric AS accuracy
  FROM public.verified_first_attempts vfa
  INNER JOIN first_guide_session fgs ON fgs.student_id = vfa.user_id
  WHERE vfa.attempted_at <= fgs.first_session_end
),
after_agg AS (
  SELECT
    guide_id,
    skill_node_id,
    COUNT(DISTINCT user_id)::integer AS students_counted,
    ROUND(AVG(accuracy), 2) AS after_accuracy
  FROM after_nodes
  GROUP BY guide_id, skill_node_id
  HAVING COUNT(DISTINCT user_id) >= 3
),
before_for_students AS (
  SELECT
    an.guide_id,
    an.skill_node_id,
    an.user_id,
    ROUND(AVG(bn.accuracy), 2) AS student_before_avg
  FROM after_nodes an
  INNER JOIN before_nodes bn
    ON bn.guide_id = an.guide_id
   AND bn.user_id = an.user_id
  GROUP BY an.guide_id, an.skill_node_id, an.user_id
),
before_agg AS (
  SELECT
    guide_id,
    skill_node_id,
    ROUND(AVG(student_before_avg), 2) AS before_accuracy
  FROM before_for_students
  GROUP BY guide_id, skill_node_id
)
SELECT
  a.guide_id,
  a.skill_node_id,
  sn.node_name,
  sn.subject,
  a.students_counted,
  a.after_accuracy,
  COALESCE(b.before_accuracy, 0::numeric) AS before_accuracy,
  GREATEST(
    -100::numeric,
    LEAST(100::numeric, ROUND(a.after_accuracy - COALESCE(b.before_accuracy, 0::numeric), 2))
  ) AS impact_lift,
  GREATEST(0::numeric, LEAST(100::numeric, ROUND(a.after_accuracy, 2))) AS impact_score
FROM after_agg a
INNER JOIN public.skill_nodes sn ON sn.id = a.skill_node_id
LEFT JOIN before_agg b
  ON b.guide_id = a.guide_id
 AND b.skill_node_id = a.skill_node_id;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_guide_impact_by_node_guide_node
  ON public.mv_guide_impact_by_node (guide_id, skill_node_id);

COMMENT ON MATERIALIZED VIEW public.mv_guide_impact_by_node IS
  'Per Guide per skill node: avg VFA accuracy on nodes first seen after a session vs student baseline before. ≥3 students.';

CREATE OR REPLACE FUNCTION public.refresh_guide_impact_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_guide_impact;
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_guide_impact_by_node;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_guide_impact;
    REFRESH MATERIALIZED VIEW public.mv_guide_impact_by_node;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_guide_impact_scores()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.refresh_guide_impact_mv();

  INSERT INTO public.guide_impact_scores (guide_id, subject, impact_score, sessions_counted, last_calculated)
  SELECT guide_id, subject, impact_score, sessions_counted, now()
  FROM public.mv_guide_impact
  ON CONFLICT (guide_id, subject) DO UPDATE SET
    impact_score = EXCLUDED.impact_score,
    sessions_counted = EXCLUDED.sessions_counted,
    last_calculated = EXCLUDED.last_calculated;

  INSERT INTO public.guide_impact_node_scores (
    guide_id,
    skill_node_id,
    node_name,
    subject,
    impact_score,
    students_counted,
    after_accuracy,
    before_accuracy,
    impact_lift,
    last_calculated
  )
  SELECT
    guide_id,
    skill_node_id,
    node_name,
    subject,
    impact_score,
    students_counted,
    after_accuracy,
    before_accuracy,
    impact_lift,
    now()
  FROM public.mv_guide_impact_by_node
  ON CONFLICT (guide_id, skill_node_id) DO UPDATE SET
    node_name = EXCLUDED.node_name,
    subject = EXCLUDED.subject,
    impact_score = EXCLUDED.impact_score,
    students_counted = EXCLUDED.students_counted,
    after_accuracy = EXCLUDED.after_accuracy,
    before_accuracy = EXCLUDED.before_accuracy,
    impact_lift = EXCLUDED.impact_lift,
    last_calculated = EXCLUDED.last_calculated;

  DELETE FROM public.guide_impact_node_scores g
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.mv_guide_impact_by_node m
    WHERE m.guide_id = g.guide_id
      AND m.skill_node_id = g.skill_node_id
  );

  INSERT INTO public.guide_impact_history (guide_id, subject, impact_score, recorded_at)
  SELECT guide_id, subject, impact_score, CURRENT_DATE
  FROM public.guide_impact_scores
  ON CONFLICT (guide_id, subject, recorded_at) DO UPDATE SET
    impact_score = EXCLUDED.impact_score;

  PERFORM public.sync_all_guide_ranks();
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_guide_impact_mv() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_guide_impact_scores() TO service_role;
