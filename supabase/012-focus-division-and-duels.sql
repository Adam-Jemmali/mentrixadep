-- Focus division (leaderboard scope) + skill duels + reward credits
-- Run in Supabase SQL Editor after 008-user-settings.sql

-- ---------------------------------------------------------------------------
-- user_settings: which division leaderboard the student focuses (optional)
-- ---------------------------------------------------------------------------
ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS focused_division_key TEXT REFERENCES divisions(key);

ALTER TABLE user_settings
  ADD COLUMN IF NOT EXISTS duel_opt_in BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN user_settings.focused_division_key IS 'Student: optional divisions.key for leaderboard focus (defaults to highest-XP division when null).';
COMMENT ON COLUMN user_settings.duel_opt_in IS 'Tutor: allow 1v1 skill challenges from students.';

-- ---------------------------------------------------------------------------
-- skill_duels: async tutor vs student quiz duel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS skill_duels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  division_key TEXT NOT NULL REFERENCES divisions(key),
  status TEXT NOT NULL CHECK (status IN ('pending', 'active', 'completed', 'declined')),
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  student_answers INT[] NULL,
  tutor_answers INT[] NULL,
  student_score INT NULL,
  tutor_score INT NULL,
  winner TEXT NULL CHECK (winner IS NULL OR winner IN ('student', 'tutor', 'tie')),
  reward_percent_off INT NOT NULL DEFAULT 15 CHECK (reward_percent_off > 0 AND reward_percent_off <= 25),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ NULL,
  CONSTRAINT skill_duels_distinct_participants CHECK (student_id <> tutor_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_duels_student ON skill_duels(student_id);
CREATE INDEX IF NOT EXISTS idx_skill_duels_tutor ON skill_duels(tutor_id);
CREATE INDEX IF NOT EXISTS idx_skill_duels_status ON skill_duels(status);

ALTER TABLE skill_duels ENABLE ROW LEVEL SECURITY;

-- Students see their duels
CREATE POLICY "Students read own skill_duels"
  ON skill_duels FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Students insert skill_duels as student"
  ON skill_duels FOR INSERT
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Students update own pending skill_duels"
  ON skill_duels FOR UPDATE
  USING (student_id = auth.uid());

-- Tutors see duels where they are tutor
CREATE POLICY "Tutors read skill_duels as tutor"
  ON skill_duels FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Tutors update skill_duels as tutor"
  ON skill_duels FOR UPDATE
  USING (tutor_id = auth.uid());

CREATE POLICY "Admins read all skill_duels"
  ON skill_duels FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Server actions use service role for deletes/complex flows; RLS covers direct API

-- ---------------------------------------------------------------------------
-- duel_credits: student discount with a tutor after winning a duel
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS duel_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  tutor_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  skill_duel_id UUID NOT NULL REFERENCES skill_duels(id) ON DELETE CASCADE,
  percent_off INT NOT NULL CHECK (percent_off > 0 AND percent_off <= 25),
  expires_at TIMESTAMPTZ NOT NULL,
  consumed_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(skill_duel_id)
);

CREATE INDEX IF NOT EXISTS idx_duel_credits_student ON duel_credits(student_id);
CREATE INDEX IF NOT EXISTS idx_duel_credits_tutor ON duel_credits(tutor_id);

ALTER TABLE duel_credits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Students read own duel_credits"
  ON duel_credits FOR SELECT
  USING (student_id = auth.uid());

CREATE POLICY "Tutors read duel_credits for their tutoring"
  ON duel_credits FOR SELECT
  USING (tutor_id = auth.uid());

CREATE POLICY "Admins read duel_credits"
  ON duel_credits FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );
