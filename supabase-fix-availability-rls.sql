-- Fix availability RLS policy to work with JWT metadata
-- The issue: JWT metadata might not be set or refreshed, causing RLS policy failures
-- Solution: Create a helper function that checks user status without causing recursion

-- Create a SECURITY DEFINER function to check if user is approved tutor
-- This bypasses RLS when checking the users table
CREATE OR REPLACE FUNCTION is_approved_tutor(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
      AND role = 'tutor'
      AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a SECURITY DEFINER function to check if user is approved student
CREATE OR REPLACE FUNCTION is_approved_student(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
      AND role = 'student'
      AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a SECURITY DEFINER function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE id = user_id
      AND role = 'admin'
      AND approved = true
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- AVAILABILITY TABLE POLICIES
-- ============================================

-- Drop and recreate policies to use the helper function
DROP POLICY IF EXISTS "Tutors can create their own availability" ON availability;
DROP POLICY IF EXISTS "Tutors can update their own availability" ON availability;
DROP POLICY IF EXISTS "Tutors can delete their own availability" ON availability;
DROP POLICY IF EXISTS "Tutors can view all availability" ON availability;
DROP POLICY IF EXISTS "Admins can view all availability" ON availability;

-- Allow tutors to view all availability (needed for browsing)
CREATE POLICY "Tutors can view all availability"
  ON availability FOR SELECT
  USING (
    is_approved_tutor(auth.uid())
    OR is_admin(auth.uid())
    OR true  -- Allow students to view availability too
  );

-- Allow tutors to create their own availability
CREATE POLICY "Tutors can create their own availability"
  ON availability FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

-- Allow tutors to update their own availability
CREATE POLICY "Tutors can update their own availability"
  ON availability FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

-- Allow tutors to delete their own availability
CREATE POLICY "Tutors can delete their own availability"
  ON availability FOR DELETE
  USING (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

-- ============================================
-- SESSION_REQUESTS TABLE POLICIES
-- ============================================

-- Update session requests policies to use helper functions
DROP POLICY IF EXISTS "Students can create session requests" ON session_requests;
DROP POLICY IF EXISTS "Tutors can update session requests for their availability" ON session_requests;

CREATE POLICY "Students can create session requests"
  ON session_requests FOR INSERT
  WITH CHECK (
    student_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'student' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_student(auth.uid())
    )
  );

CREATE POLICY "Tutors can update session requests for their availability"
  ON session_requests FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

-- ============================================
-- SESSIONS TABLE POLICIES
-- ============================================

-- Update sessions policies to use helper functions
DROP POLICY IF EXISTS "Tutors can create sessions from approved requests" ON sessions;
DROP POLICY IF EXISTS "Tutors can update their sessions" ON sessions;

CREATE POLICY "Tutors can create sessions from approved requests"
  ON sessions FOR INSERT
  WITH CHECK (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

CREATE POLICY "Tutors can update their sessions"
  ON sessions FOR UPDATE
  USING (
    tutor_id = auth.uid()
    AND (
      ((auth.jwt()->>'role')::text = 'tutor' AND (auth.jwt()->>'approved')::text = 'true')
      OR is_approved_tutor(auth.uid())
    )
  );

