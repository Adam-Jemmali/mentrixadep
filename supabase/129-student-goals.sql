-- PROMPT 008: Student goals for Verdict Engine personalization.
-- Run after 128-peer-comparison-snapshots.sql

CREATE TABLE IF NOT EXISTS public.student_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  subject text NOT NULL,
  goal_type text NOT NULL CHECK (
    goal_type IN ('exam_date', 'percentile_target', 'pace_target')
  ),
  target_date date,
  target_percentile numeric(5, 2),
  created_at timestamptz NOT NULL DEFAULT now(),
  active boolean NOT NULL DEFAULT true,
  CONSTRAINT student_goals_percentile_range CHECK (
    target_percentile IS NULL
    OR (target_percentile >= 1 AND target_percentile <= 99)
  ),
  CONSTRAINT student_goals_exam_requires_date CHECK (
    goal_type <> 'exam_date' OR target_date IS NOT NULL
  ),
  CONSTRAINT student_goals_percentile_requires_target CHECK (
    goal_type <> 'percentile_target' OR target_percentile IS NOT NULL
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_student_goals_one_active_per_subject
  ON public.student_goals (user_id, subject)
  WHERE active = true;

CREATE INDEX IF NOT EXISTS idx_student_goals_user_active
  ON public.student_goals (user_id, subject)
  WHERE active = true;

ALTER TABLE public.student_goals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS student_goals_read_own ON public.student_goals;
CREATE POLICY student_goals_read_own ON public.student_goals
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS student_goals_insert_own ON public.student_goals;
CREATE POLICY student_goals_insert_own ON public.student_goals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS student_goals_update_own ON public.student_goals;
CREATE POLICY student_goals_update_own ON public.student_goals
  FOR UPDATE USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

COMMENT ON TABLE public.student_goals IS
  'PROMPT 008: One active goal per student per subject; read by Verdict Engine for nextAction filtering.';
