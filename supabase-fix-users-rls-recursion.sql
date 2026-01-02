-- Fix infinite recursion in users table RLS policies
-- The issue: Policies were querying the users table to check admin/role status,
-- which triggered the same policies again, causing infinite recursion.
-- Solution: Use JWT metadata instead, which doesn't require querying the users table.

-- ============================================
-- USERS TABLE POLICIES
-- ============================================

-- Drop the problematic policies
DROP POLICY IF EXISTS "Admins can view all users" ON users;
DROP POLICY IF EXISTS "Admins can update all users" ON users;

-- Recreate policies using JWT metadata instead
CREATE POLICY "Admins can view all users"
  ON users FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update all users"
  ON users FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- ============================================
-- REGISTRATION_REQUESTS TABLE POLICIES
-- ============================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Users can view their own registration requests" ON registration_requests;
DROP POLICY IF EXISTS "Admins can update registration requests" ON registration_requests;

CREATE POLICY "Users can view their own registration requests"
  ON registration_requests FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update registration requests"
  ON registration_requests FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- ============================================
-- AVAILABILITY TABLE POLICIES
-- ============================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Tutors can create their own availability" ON availability;
DROP POLICY IF EXISTS "Tutors can update their own availability" ON availability;
DROP POLICY IF EXISTS "Tutors can delete their own availability" ON availability;
DROP POLICY IF EXISTS "Admins can view all availability" ON availability;

CREATE POLICY "Tutors can create their own availability"
  ON availability FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Tutors can update their own availability"
  ON availability FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Tutors can delete their own availability"
  ON availability FOR DELETE
  USING (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Admins can view all availability"
  ON availability FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- ============================================
-- SESSION_REQUESTS TABLE POLICIES
-- ============================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Students and tutors can view relevant session requests" ON session_requests;
DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
DROP POLICY IF EXISTS "Tutors can update session requests for their availability" ON session_requests;
DROP POLICY IF EXISTS "Admins can view all session requests" ON session_requests;
DROP POLICY IF EXISTS "Admins can update session requests" ON session_requests;

CREATE POLICY "Students and tutors can view relevant session requests"
  ON session_requests FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Students can create session requests"
  ON session_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'student'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Tutors can update session requests for their availability"
  ON session_requests FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Admins can view all session requests"
  ON session_requests FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update session requests"
  ON session_requests FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- ============================================
-- SESSIONS TABLE POLICIES
-- ============================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Students and tutors can view their sessions" ON sessions;
DROP POLICY IF EXISTS "Tutors can create sessions from approved requests" ON sessions;
DROP POLICY IF EXISTS "Tutors can update their sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can view all sessions" ON sessions;
DROP POLICY IF EXISTS "Admins can update sessions" ON sessions;

CREATE POLICY "Students and tutors can view their sessions"
  ON sessions FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Tutors can create sessions from approved requests"
  ON sessions FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Tutors can update their sessions"
  ON sessions FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (auth.jwt()->>'role')::text = 'tutor'
    AND (auth.jwt()->>'approved')::text = 'true'
  );

CREATE POLICY "Admins can view all sessions"
  ON sessions FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can update sessions"
  ON sessions FOR UPDATE
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );

-- ============================================
-- RATINGS TABLE POLICIES
-- ============================================

-- Drop and recreate policies
DROP POLICY IF EXISTS "Students and tutors can view ratings for their sessions" ON ratings;
DROP POLICY IF EXISTS "Admins can view all ratings" ON ratings;

CREATE POLICY "Students and tutors can view ratings for their sessions"
  ON ratings FOR SELECT
  USING (
    student_id = auth.uid()
    OR tutor_id = auth.uid()
    OR (auth.jwt()->>'role')::text = 'admin'
  );

CREATE POLICY "Admins can view all ratings"
  ON ratings FOR SELECT
  USING (
    (auth.jwt()->>'role')::text = 'admin'
  );
