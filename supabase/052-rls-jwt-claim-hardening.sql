-- Replace RLS decisions that trust auth.jwt role/approved claims
-- with database-backed checks via is_admin/is_approved_* helpers.

-- users
DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
  FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all users" ON public.users;
CREATE POLICY "Admins can update all users" ON public.users
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- registration_requests
DROP POLICY IF EXISTS "Anyone can create registration requests" ON public.registration_requests;
CREATE POLICY "Anyone can create registration requests" ON public.registration_requests
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Users can view their own registration requests" ON public.registration_requests;
CREATE POLICY "Users can view their own registration requests" ON public.registration_requests
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR is_admin(auth.uid())
  );

DROP POLICY IF EXISTS "Admins can update registration requests" ON public.registration_requests;
CREATE POLICY "Admins can update registration requests" ON public.registration_requests
  FOR UPDATE
  USING (is_admin(auth.uid()));

-- availability
DROP POLICY IF EXISTS "Tutors can create their own availability" ON public.availability;
CREATE POLICY "Tutors can create their own availability" ON public.availability
  FOR INSERT
  WITH CHECK (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

DROP POLICY IF EXISTS "Tutors can update their own availability" ON public.availability;
CREATE POLICY "Tutors can update their own availability" ON public.availability
  FOR UPDATE
  USING (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

DROP POLICY IF EXISTS "Tutors can delete their own availability" ON public.availability;
CREATE POLICY "Tutors can delete their own availability" ON public.availability
  FOR DELETE
  USING (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

-- session_requests
DROP POLICY IF EXISTS "Students and tutors can view relevant session requests" ON public.session_requests;
CREATE POLICY "Students and tutors can view relevant session requests" ON public.session_requests
  FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Students can create session requests" ON public.session_requests;
CREATE POLICY "Students can create session requests" ON public.session_requests
  FOR INSERT
  WITH CHECK (student_id = auth.uid() AND is_approved_student(auth.uid()));

DROP POLICY IF EXISTS "Tutors can update session requests for their availability" ON public.session_requests;
CREATE POLICY "Tutors can update session requests for their availability" ON public.session_requests
  FOR UPDATE
  USING (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

-- sessions
DROP POLICY IF EXISTS "Students and tutors can view their sessions" ON public.sessions;
CREATE POLICY "Students and tutors can view their sessions" ON public.sessions
  FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Tutors can create sessions from approved requests" ON public.sessions;
CREATE POLICY "Tutors can create sessions from approved requests" ON public.sessions
  FOR INSERT
  WITH CHECK (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

DROP POLICY IF EXISTS "Tutors can update their sessions" ON public.sessions;
CREATE POLICY "Tutors can update their sessions" ON public.sessions
  FOR UPDATE
  USING (tutor_id = auth.uid() AND is_approved_tutor(auth.uid()));

-- ratings
DROP POLICY IF EXISTS "Students and tutors can view ratings for their sessions" ON public.ratings;
CREATE POLICY "Students and tutors can view ratings for their sessions" ON public.ratings
  FOR SELECT
  USING (student_id = auth.uid() OR tutor_id = auth.uid() OR is_admin(auth.uid()));

-- Past-session delete helpers
DROP POLICY IF EXISTS "Students can delete their past sessions" ON public.sessions;
CREATE POLICY "Students can delete their past sessions" ON public.sessions
  FOR DELETE
  USING (
    student_id = auth.uid()
    AND end_time < NOW()
    AND is_approved_student(auth.uid())
  );

DROP POLICY IF EXISTS "Tutors can delete their past sessions" ON public.sessions;
CREATE POLICY "Tutors can delete their past sessions" ON public.sessions
  FOR DELETE
  USING (
    tutor_id = auth.uid()
    AND end_time < NOW()
    AND is_approved_tutor(auth.uid())
  );

-- course expertise policies
DROP POLICY IF EXISTS "Admins can read all tutor courses" ON public.tutor_courses;
CREATE POLICY "Admins can read all tutor courses" ON public.tutor_courses
  FOR SELECT
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update tutor courses" ON public.tutor_courses;
CREATE POLICY "Admins can update tutor courses" ON public.tutor_courses
  FOR UPDATE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete tutor courses" ON public.tutor_courses;
CREATE POLICY "Admins can delete tutor courses" ON public.tutor_courses
  FOR DELETE
  USING (is_admin(auth.uid()));

DROP POLICY IF EXISTS "Students can read tutor courses" ON public.tutor_courses;
CREATE POLICY "Students can read tutor courses" ON public.tutor_courses
  FOR SELECT
  USING (is_approved_student(auth.uid()) OR is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can read all student courses" ON public.student_courses;
CREATE POLICY "Admins can read all student courses" ON public.student_courses
  FOR SELECT
  USING (is_admin(auth.uid()));

-- referral rewards
DROP POLICY IF EXISTS "Users can read own referral rewards" ON public.referral_rewards;
CREATE POLICY "Users can read own referral rewards" ON public.referral_rewards
  FOR SELECT
  USING (
    auth.uid() = referrer_id
    OR auth.uid() = referred_id
    OR is_admin(auth.uid())
  );
