-- Session Lifecycle Management Functions
-- Run this in Supabase SQL Editor

-- Function to auto-complete sessions after end_time
CREATE OR REPLACE FUNCTION auto_complete_sessions()
RETURNS void AS $$
BEGIN
  UPDATE sessions
  SET completed = true
  WHERE completed = false
    AND end_time <= NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to handle auto-approval when tutor has auto_approve enabled
CREATE OR REPLACE FUNCTION handle_auto_approve_session_request()
RETURNS TRIGGER AS $$
DECLARE
  tutor_auto_approve BOOLEAN;
  tutor_approved BOOLEAN;
  existing_tutor_session_id UUID;
  existing_student_session_id UUID;
  avail_start_time TIMESTAMPTZ;
  avail_end_time TIMESTAMPTZ;
  avail_course TEXT;
BEGIN
  -- Only process new pending requests
  IF NEW.status != 'pending' THEN
    RETURN NEW;
  END IF;

  -- Get tutor's auto_approve setting and approval status
  SELECT auto_approve, approved INTO tutor_auto_approve, tutor_approved
  FROM users
  WHERE id = NEW.tutor_id;

  -- Only auto-approve if tutor has it enabled and is approved
  IF tutor_auto_approve = true AND tutor_approved = true THEN
    -- Get availability details
    SELECT start_time, end_time, course 
    INTO avail_start_time, avail_end_time, avail_course
    FROM availability
    WHERE id = NEW.availability_id;

    IF avail_start_time IS NULL THEN
      RETURN NEW;
    END IF;

    -- Check if tutor already has a session at this time
    SELECT id INTO existing_tutor_session_id
    FROM sessions
    WHERE tutor_id = NEW.tutor_id
      AND start_time = avail_start_time
    LIMIT 1;

    -- Check if student already has a session at this time
    SELECT id INTO existing_student_session_id
    FROM sessions
    WHERE student_id = NEW.student_id
      AND start_time = avail_start_time
    LIMIT 1;

    -- Only create session if no conflicts
    IF existing_tutor_session_id IS NULL AND existing_student_session_id IS NULL THEN
      -- Create the session
      INSERT INTO sessions (
        student_id,
        tutor_id,
        course,
        start_time,
        end_time,
        completed
      )
      VALUES (
        NEW.student_id,
        NEW.tutor_id,
        avail_course,
        avail_start_time,
        avail_end_time,
        false
      );

      -- Delete the availability slot
      DELETE FROM availability WHERE id = NEW.availability_id;

      -- Update request status to approved
      UPDATE session_requests
      SET status = 'approved', updated_at = NOW()
      WHERE id = NEW.id;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS auto_approve_session_request_trigger ON session_requests;

-- Trigger to auto-approve session requests (AFTER INSERT to allow status update)
CREATE TRIGGER auto_approve_session_request_trigger
  AFTER INSERT ON session_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_auto_approve_session_request();

-- Function to ensure ratings can only be created for completed sessions
CREATE OR REPLACE FUNCTION validate_rating_session()
RETURNS TRIGGER AS $$
DECLARE
  session_completed BOOLEAN;
  session_end_time TIMESTAMPTZ;
BEGIN
  -- Get session details
  SELECT completed, end_time INTO session_completed, session_end_time
  FROM sessions
  WHERE id = NEW.session_id;

  -- Check if session exists
  IF session_completed IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  -- Check if session is completed
  IF session_completed = false THEN
    RAISE EXCEPTION 'Cannot rate incomplete session';
  END IF;

  -- Check if session has ended
  IF session_end_time > NOW() THEN
    RAISE EXCEPTION 'Cannot rate session before it ends';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to validate ratings
DROP TRIGGER IF EXISTS validate_rating_trigger ON ratings;
CREATE TRIGGER validate_rating_trigger
  BEFORE INSERT OR UPDATE ON ratings
  FOR EACH ROW
  EXECUTE FUNCTION validate_rating_session();
