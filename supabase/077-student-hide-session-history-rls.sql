-- Allow students to UPDATE their own sessions to set student_hidden_at (history hide).
-- hideSessionForActor uses UPDATE, not DELETE; without this policy RLS blocks the change.

DROP POLICY IF EXISTS "Students can hide sessions from own history" ON public.sessions;
CREATE POLICY "Students can hide sessions from own history" ON public.sessions
  FOR UPDATE
  TO authenticated
  USING (
    student_id = auth.uid()
    AND is_approved_student(auth.uid())
    AND (
      end_time < now()
      OR lower(trim(both from coalesce(status, ''))) IN ('completed', 'cancelled')
      OR completed = true
    )
  )
  WITH CHECK (student_id = auth.uid());
