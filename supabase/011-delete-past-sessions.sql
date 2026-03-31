-- Allow students and tutors to delete only their own past sessions (end_time < now).
-- Server actions also enforce this; policies protect direct API access.

DROP POLICY IF EXISTS "Students can delete their past sessions" ON sessions;
CREATE POLICY "Students can delete their past sessions" ON sessions FOR DELETE
  USING (
    student_id = auth.uid()
    AND end_time < NOW()
    AND (
      ((auth.jwt()->>'role')::text = 'student' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_student(auth.uid())
    )
  );

DROP POLICY IF EXISTS "Tutors can delete their past sessions" ON sessions;
CREATE POLICY "Tutors can delete their past sessions" ON sessions FOR DELETE
  USING (
    tutor_id = auth.uid()
    AND end_time < NOW()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );
