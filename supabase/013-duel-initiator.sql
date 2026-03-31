-- Who created the pending duel: student challenges tutor, or tutor challenges student.
-- Run after 012-focus-division-and-duels.sql

ALTER TABLE skill_duels
  ADD COLUMN IF NOT EXISTS initiator_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN skill_duels.initiator_id IS 'User who sent the challenge; the other party accepts/declines while pending.';

-- Historical rows: student started the challenge
UPDATE skill_duels
SET initiator_id = student_id
WHERE initiator_id IS NULL;

DROP POLICY IF EXISTS "Students insert skill_duels as student" ON skill_duels;
CREATE POLICY "Students insert skill_duels as student"
  ON skill_duels FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND (initiator_id IS NULL OR initiator_id = auth.uid())
  );

-- Tutors may create duels (invite learner)
DROP POLICY IF EXISTS "Tutors insert skill_duels as tutor" ON skill_duels;
CREATE POLICY "Tutors insert skill_duels as tutor"
  ON skill_duels FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND student_id <> auth.uid()
    AND initiator_id = auth.uid()
  );
