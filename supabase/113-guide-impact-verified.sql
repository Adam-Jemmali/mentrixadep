-- Guide Impact Score — rebuild from session_target_nodes (verified pre/post first attempts)
-- Run after 111-session-node-targets.sql

DROP MATERIALIZED VIEW IF EXISTS public.mv_guide_impact;

CREATE MATERIALIZED VIEW public.mv_guide_impact AS
WITH session_node_outcomes AS (
  SELECT
    s.tutor_id AS guide_id,
    s.course AS subject,
    s.id AS session_id,
    COUNT(*) FILTER (
      WHERE stn.pre_session_correct IS NOT TRUE
        AND stn.post_session_correct = true
    )::int AS improved_nodes,
    COUNT(*) FILTER (WHERE stn.post_session_correct IS NOT NULL)::int AS evaluated_nodes
  FROM public.sessions s
  INNER JOIN public.session_target_nodes stn ON stn.session_id = s.id
  WHERE s.status = 'completed'
    AND s.completed = true
    AND stn.post_session_checked_at IS NOT NULL
  GROUP BY s.tutor_id, s.course, s.id
),
session_scores AS (
  SELECT
    guide_id,
    subject,
    session_id,
    CASE
      WHEN evaluated_nodes > 0 THEN
        ROUND((improved_nodes::numeric / evaluated_nodes::numeric) * 100, 2)
      ELSE 0::numeric
    END AS session_impact_pct
  FROM session_node_outcomes
  WHERE evaluated_nodes > 0
)
SELECT
  guide_id,
  subject,
  ROUND(AVG(session_impact_pct)::numeric, 2) AS impact_score,
  COUNT(*)::int AS sessions_counted
FROM session_scores
GROUP BY guide_id, subject
HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_guide_impact_guide_subject
  ON public.mv_guide_impact (guide_id, subject);

COMMENT ON MATERIALIZED VIEW public.mv_guide_impact IS
  'Guide impact from verified session_target_nodes pre/post first-attempt movement (≥3 sessions).';

-- sync_guide_impact_scores is redefined in 096-guide-ranks.sql (history + rank); refresh MV only here.
CREATE OR REPLACE FUNCTION public.refresh_guide_impact_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_guide_impact;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_guide_impact;
END;
$$;

GRANT EXECUTE ON FUNCTION public.refresh_guide_impact_mv() TO service_role;
