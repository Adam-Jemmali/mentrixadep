-- Guide Rank Ladder — teaching reputation separate from Mentrixer rank
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS guide_rank text NOT NULL DEFAULT 'practitioner',
  ADD COLUMN IF NOT EXISTS guide_rank_updated_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_users_guide_rank ON users (guide_rank)
  WHERE role = 'tutor';

-- Daily snapshots for Impact Score trend charts on Guide dashboard
CREATE TABLE IF NOT EXISTS guide_impact_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  guide_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject text NOT NULL,
  impact_score numeric(5,2) NOT NULL DEFAULT 0,
  recorded_at date NOT NULL DEFAULT CURRENT_DATE,
  UNIQUE (guide_id, subject, recorded_at)
);

CREATE INDEX IF NOT EXISTS idx_guide_impact_history_guide_date
  ON guide_impact_history (guide_id, recorded_at DESC);

ALTER TABLE guide_impact_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Guides read own impact history"
  ON guide_impact_history FOR SELECT
  USING (auth.uid() = guide_id);

CREATE POLICY "Service role full access guide impact history"
  ON guide_impact_history FOR ALL
  USING (auth.jwt()->>'role' = 'service_role');

CREATE OR REPLACE FUNCTION public.calculate_guide_rank(p_guide_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_sessions int;
  v_max_impact numeric;
  v_elite_threshold numeric;
  v_rank text := 'practitioner';
BEGIN
  SELECT COUNT(*)::int INTO v_sessions
  FROM public.sessions
  WHERE tutor_id = p_guide_id
    AND status = 'completed'
    AND completed = true;

  SELECT COALESCE(MAX(impact_score), 0) INTO v_max_impact
  FROM public.guide_impact_scores
  WHERE guide_id = p_guide_id
    AND sessions_counted >= 3;

  SELECT COALESCE(
    (
      SELECT percentile_cont(0.99) WITHIN GROUP (ORDER BY max_imp)
      FROM (
        SELECT MAX(impact_score) AS max_imp
        FROM public.guide_impact_scores
        WHERE sessions_counted >= 3
        GROUP BY guide_id
      ) t
    ),
    100
  ) INTO v_elite_threshold;

  IF v_sessions >= 200 AND v_max_impact >= v_elite_threshold THEN
    v_rank := 'elite';
  ELSIF v_sessions >= 100 AND v_max_impact > 90 THEN
    v_rank := 'master';
  ELSIF v_sessions >= 50 AND v_max_impact > 80 THEN
    v_rank := 'expert';
  ELSIF v_sessions >= 20 AND v_max_impact > 70 THEN
    v_rank := 'specialist';
  ELSIF v_sessions >= 5 THEN
    v_rank := 'practitioner';
  ELSE
    v_rank := 'practitioner';
  END IF;

  UPDATE public.users
  SET guide_rank = v_rank,
      guide_rank_updated_at = now()
  WHERE id = p_guide_id
    AND role = 'tutor';

  RETURN v_rank;
END;
$$;

CREATE OR REPLACE FUNCTION public.sync_all_guide_ranks()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT id FROM public.users WHERE role = 'tutor' AND approved = true
  LOOP
    PERFORM public.calculate_guide_rank(r.id);
  END LOOP;
END;
$$;

-- Anonymized breakthrough events for public Guide profiles
CREATE OR REPLACE FUNCTION public.get_guide_breakthroughs(p_guide_id uuid, p_limit int DEFAULT 5)
RETURNS TABLE(
  concept text,
  pre_percent numeric,
  post_percent numeric
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
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
    FROM public.user_quest_progress uqp
    INNER JOIN public.quests q ON q.id = uqp.quest_id
    WHERE uqp.status = 'completed'
      AND uqp.last_attempt_at IS NOT NULL
  ),
  session_improvements AS (
    SELECT
      s.course AS concept,
      pre.pre_acc AS pre_percent,
      post.post_acc AS post_percent,
      CASE
        WHEN post.post_acc > pre.pre_acc AND pre.pre_acc IS NOT NULL AND post.post_acc IS NOT NULL THEN
          (post.post_acc - pre.pre_acc) / NULLIF(100 - pre.pre_acc, 0) * 100
        ELSE 0
      END AS improvement
    FROM public.sessions s
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
    WHERE s.tutor_id = p_guide_id
      AND s.status = 'completed'
      AND s.completed = true
      AND pre.pre_acc IS NOT NULL
      AND post.post_acc IS NOT NULL
      AND post.post_acc > pre.pre_acc
  )
  SELECT
    concept,
    ROUND(pre_percent, 0),
    ROUND(post_percent, 0)
  FROM session_improvements
  ORDER BY improvement DESC
  LIMIT GREATEST(p_limit, 1);
$$;

-- Extend daily impact sync: history snapshot + rank recalculation
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

  INSERT INTO public.guide_impact_history (guide_id, subject, impact_score, recorded_at)
  SELECT guide_id, subject, impact_score, CURRENT_DATE
  FROM public.guide_impact_scores
  ON CONFLICT (guide_id, subject, recorded_at) DO UPDATE SET
    impact_score = EXCLUDED.impact_score;

  PERFORM public.sync_all_guide_ranks();
END;
$$;

COMMENT ON FUNCTION public.calculate_guide_rank(uuid) IS
  'Compute and persist guide_rank from sessions + guide_impact_scores.';

COMMENT ON FUNCTION public.get_guide_breakthroughs(uuid, int) IS
  'Anonymized pre/post accuracy breakthroughs for a Guide public profile.';

GRANT EXECUTE ON FUNCTION public.calculate_guide_rank(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.sync_all_guide_ranks() TO service_role;
GRANT EXECUTE ON FUNCTION public.get_guide_breakthroughs(uuid, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_guide_breakthroughs(uuid, int) TO service_role;
