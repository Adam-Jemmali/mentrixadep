-- Guide Impact Score — outcome-based teaching effectiveness from quest accuracy deltas
CREATE TABLE IF NOT EXISTS guide_impact_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  impact_score numeric(5,2) NOT NULL DEFAULT 0,
  sessions_counted int NOT NULL DEFAULT 0,
  last_calculated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (guide_id, subject)
);

CREATE INDEX IF NOT EXISTS idx_guide_impact_scores_guide
  ON guide_impact_scores (guide_id);

CREATE INDEX IF NOT EXISTS idx_guide_impact_scores_subject_score
  ON guide_impact_scores (subject, impact_score DESC);

ALTER TABLE guide_impact_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users read guide impact scores"
  ON guide_impact_scores FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Service role full access guide impact scores"
  ON guide_impact_scores FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

-- Pre/post session quest accuracy → per-guide subject impact (≥3 sessions with data)
CREATE MATERIALIZED VIEW mv_guide_impact AS
WITH quest_scores AS (
  SELECT
    uqp.user_id AS student_id,
    lower(trim(COALESCE(q.metadata->>'course', 'General'))) AS course_key,
    uqp.last_attempt_at AS completed_at,
    CASE
      WHEN COALESCE((q.metadata->'result'->>'total')::int, 0) > 0 THEN
        ROUND(
          ((q.metadata->'result'->>'correct')::numeric /
           NULLIF((q.metadata->'result'->>'total')::numeric, 0)) * 100,
          2
        )
      WHEN uqp.num_attempts > 0 THEN ROUND(100.0 / uqp.num_attempts, 2)
      ELSE 0::numeric
    END AS score_percentage
  FROM user_quest_progress uqp
  INNER JOIN quests q ON q.id = uqp.quest_id
  WHERE uqp.status = 'completed'
    AND uqp.last_attempt_at IS NOT NULL
),
session_metrics AS (
  SELECT
    s.tutor_id AS guide_id,
    s.course AS subject,
    pre.pre_acc,
    post.post_acc
  FROM sessions s
  LEFT JOIN LATERAL (
    SELECT AVG(sub.score_percentage) AS pre_acc
    FROM (
      SELECT qs.score_percentage
      FROM quest_scores qs
      WHERE qs.student_id = s.student_id
        AND qs.course_key = lower(trim(s.course))
        AND qs.completed_at < COALESCE(s.end_time, s.start_time)
      ORDER BY qs.completed_at DESC
      LIMIT 5
    ) sub
  ) pre ON true
  LEFT JOIN LATERAL (
    SELECT AVG(sub.score_percentage) AS post_acc
    FROM (
      SELECT qs.score_percentage
      FROM quest_scores qs
      WHERE qs.student_id = s.student_id
        AND qs.course_key = lower(trim(s.course))
        AND qs.completed_at > COALESCE(s.end_time, s.start_time)
        AND qs.completed_at <= COALESCE(s.end_time, s.start_time) + interval '14 days'
      ORDER BY qs.completed_at ASC
      LIMIT 5
    ) sub
  ) post ON true
  WHERE s.status = 'completed'
    AND s.completed = true
)
SELECT
  guide_id,
  subject,
  ROUND(
    AVG(
      CASE
        WHEN post_acc > pre_acc AND pre_acc IS NOT NULL AND post_acc IS NOT NULL THEN
          LEAST((post_acc - pre_acc) / NULLIF(100 - pre_acc, 0) * 100, 100)
        ELSE 0
      END
    )::numeric,
    2
  ) AS impact_score,
  COUNT(*)::int AS sessions_counted
FROM session_metrics
WHERE pre_acc IS NOT NULL
  AND post_acc IS NOT NULL
GROUP BY guide_id, subject
HAVING COUNT(*) >= 3;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_guide_impact_guide_subject
  ON mv_guide_impact (guide_id, subject);

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
END;
$$;

COMMENT ON FUNCTION public.refresh_guide_impact_mv IS
  'Refresh guide impact materialized view (daily cron).';

COMMENT ON FUNCTION public.sync_guide_impact_scores IS
  'Refresh MV and upsert guide_impact_scores table (daily cron).';

GRANT EXECUTE ON FUNCTION public.refresh_guide_impact_mv() TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_guide_impact_scores() TO service_role;
