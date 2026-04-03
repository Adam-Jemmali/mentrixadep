-- Performance: composite indexes, division leaderboard materialized view, hub RPCs.
-- Run after 037-push-subscriptions.sql

-- ─── Sessions: common filter patterns ─────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_sessions_tutor_status ON public.sessions (tutor_id, status);
CREATE INDEX IF NOT EXISTS idx_sessions_student_status ON public.sessions (student_id, status);

-- ─── user_xp: global leaderboards / sorts ───────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_xp_total_xp_desc ON public.user_xp (total_xp DESC);

-- ─── availability: tutor + active + time window (booking_status from 034) ───
CREATE INDEX IF NOT EXISTS idx_availability_tutor_active_booking_start
  ON public.availability (tutor_id, active, booking_status, start_time);

-- ─── skill_duels: participant + status (schema: student_id + opponent_student_id) ─
CREATE INDEX IF NOT EXISTS idx_skill_duels_student_status ON public.skill_duels (student_id, status);
CREATE INDEX IF NOT EXISTS idx_skill_duels_opponent_status ON public.skill_duels (opponent_student_id, status)
  WHERE opponent_student_id IS NOT NULL;

-- ─── Quest progress / quests listing ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_user_quest_progress_user_last_attempt
  ON public.user_quest_progress (user_id, last_attempt_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_quests_creator_created ON public.quests (creator_user_id, created_at DESC);

-- ─── Materialized view: per-division XP for leaderboard & ranks ─────────────
DROP MATERIALIZED VIEW IF EXISTS public.mv_division_leaderboard;

CREATE MATERIALIZED VIEW public.mv_division_leaderboard AS
SELECT
  d.key AS division_key,
  u.user_id,
  COALESCE(NULLIF(trim(u.division_xp->>d.key), '')::integer, 0) AS division_xp,
  COALESCE(u.streak_days, 0) AS streak_days
FROM public.user_xp u
CROSS JOIN public.divisions d
WHERE d.active = true
  AND COALESCE(NULLIF(trim(u.division_xp->>d.key), '')::integer, 0) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_mv_division_leaderboard_div_user
  ON public.mv_division_leaderboard (division_key, user_id);

CREATE INDEX IF NOT EXISTS idx_mv_division_leaderboard_div_xp
  ON public.mv_division_leaderboard (division_key, division_xp DESC);

COMMENT ON MATERIALIZED VIEW public.mv_division_leaderboard IS
  'Pre-aggregated division XP rows for leaderboards. Refresh every 5 minutes (cron /api/cron/refresh-division-leaderboard).';

-- Initial populate
REFRESH MATERIALIZED VIEW public.mv_division_leaderboard;

-- Called by cron (service role) — CONCURRENTLY requires unique index uq_mv_division_leaderboard_div_user
CREATE OR REPLACE FUNCTION public.refresh_division_leaderboard_mv()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY public.mv_division_leaderboard;
EXCEPTION
  WHEN OTHERS THEN
    REFRESH MATERIALIZED VIEW public.mv_division_leaderboard;
END;
$$;

COMMENT ON FUNCTION public.refresh_division_leaderboard_mv IS
  'Refresh division leaderboard MV (every ~5 minutes).';

GRANT EXECUTE ON FUNCTION public.refresh_division_leaderboard_mv() TO service_role;

-- ─── RPC: single round-trip snapshot for student hub ─────────────────────────
CREATE OR REPLACE FUNCTION public.student_hub_snapshot(p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_ok boolean;
BEGIN
  v_ok := (p_user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.users u WHERE u.id = auth.uid() AND u.role = 'admin');
  IF NOT v_ok THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN jsonb_build_object(
    'user_xp', (SELECT to_jsonb(x.*) FROM public.user_xp x WHERE x.user_id = p_user_id),
    'user_settings', (SELECT to_jsonb(s.*) FROM public.user_settings s WHERE s.user_id = p_user_id),
    'student_courses', COALESCE(
      (SELECT jsonb_agg(to_jsonb(sc.*) ORDER BY sc.created_at ASC)
       FROM public.student_courses sc WHERE sc.student_id = p_user_id),
      '[]'::jsonb
    ),
    'has_pending_requests', EXISTS (
      SELECT 1 FROM public.session_requests sr
      WHERE sr.student_id = p_user_id AND sr.status = 'pending'
    ),
    'tutor_expertise', COALESCE(
      (SELECT jsonb_object_agg(t.tutor_id::text, t.courses)
       FROM (
         SELECT
           tc.tutor_id,
           jsonb_agg(
             jsonb_build_object(
               'course_name', tc.course_name,
               'proof_description', tc.proof_description,
               'verified', tc.verified
             ) ORDER BY tc.course_name
           ) AS courses
         FROM public.tutor_courses tc
         GROUP BY tc.tutor_id
       ) t),
      '{}'::jsonb
    ),
    'available_courses', COALESCE(
      (SELECT jsonb_agg(sub.course ORDER BY sub.course)
       FROM (
         SELECT DISTINCT a.course
         FROM public.availability a
         WHERE a.active = true AND a.start_time >= now()
       ) sub),
      '[]'::jsonb
    ),
    'in_progress_quest', (
      SELECT jsonb_build_object(
        'quest_id', uqp.quest_id,
        'prompt', q.prompt,
        'num_attempts', uqp.num_attempts
      )
      FROM public.user_quest_progress uqp
      INNER JOIN public.quests q ON q.id = uqp.quest_id
      WHERE uqp.user_id = p_user_id AND uqp.status = 'in_progress'
      ORDER BY uqp.last_attempt_at DESC NULLS LAST
      LIMIT 1
    )
  );
END;
$$;

COMMENT ON FUNCTION public.student_hub_snapshot(uuid) IS
  'Aggregates user_xp, settings, courses, pending flag, tutor expertise map, course list, in-progress quest for /student hub.';

GRANT EXECUTE ON FUNCTION public.student_hub_snapshot(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.student_hub_snapshot(uuid) TO service_role;
