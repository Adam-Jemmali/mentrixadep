-- Skill duels: student vs student only. Remove tutor session credits.
-- Run after 015-duel-credit-checkout-idempotency.sql

DROP TABLE IF EXISTS duel_credit_checkout_applications CASCADE;
DROP TABLE IF EXISTS duel_credits CASCADE;

ALTER TABLE skill_duels DROP CONSTRAINT IF EXISTS skill_duels_tutor_id_fkey;
ALTER TABLE skill_duels RENAME COLUMN tutor_id TO opponent_student_id;

ALTER TABLE skill_duels RENAME COLUMN tutor_answers TO opponent_answers;
ALTER TABLE skill_duels RENAME COLUMN tutor_score TO opponent_score;

UPDATE skill_duels SET winner = 'opponent' WHERE winner = 'tutor';

ALTER TABLE skill_duels DROP CONSTRAINT IF EXISTS skill_duels_winner_check;
ALTER TABLE skill_duels ADD CONSTRAINT skill_duels_winner_check
  CHECK (winner IS NULL OR winner IN ('student', 'opponent', 'tie'));

ALTER TABLE skill_duels
  ADD CONSTRAINT skill_duels_opponent_student_id_fkey
  FOREIGN KEY (opponent_student_id) REFERENCES auth.users(id) ON DELETE CASCADE;

DROP POLICY IF EXISTS "Tutors read skill_duels as tutor" ON skill_duels;
DROP POLICY IF EXISTS "Tutors update skill_duels as tutor" ON skill_duels;
DROP POLICY IF EXISTS "Tutors insert skill_duels as tutor" ON skill_duels;

DROP POLICY IF EXISTS "Students read own skill_duels" ON skill_duels;
CREATE POLICY "Students read skill_duels as participant"
  ON skill_duels FOR SELECT
  USING (student_id = auth.uid() OR opponent_student_id = auth.uid());

DROP POLICY IF EXISTS "Students insert skill_duels as student" ON skill_duels;
CREATE POLICY "Students insert skill_duels as challenger"
  ON skill_duels FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND opponent_student_id <> auth.uid()
    AND (initiator_id IS NULL OR initiator_id = auth.uid())
  );

DROP POLICY IF EXISTS "Students update own pending skill_duels" ON skill_duels;
CREATE POLICY "Students update skill_duels as participant"
  ON skill_duels FOR UPDATE
  USING (student_id = auth.uid() OR opponent_student_id = auth.uid());

COMMENT ON COLUMN user_settings.duel_opt_in IS 'Student: allow skill duel challenges from other students.';
