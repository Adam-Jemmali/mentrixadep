-- validate_rating_session previously required end_time <= now() even when completed = true,
-- which blocked students from rating after a tutor marked the session complete early.

CREATE OR REPLACE FUNCTION validate_rating_session()
RETURNS TRIGGER AS $$
DECLARE
  session_completed BOOLEAN;
  session_status TEXT;
BEGIN
  SELECT completed, status INTO session_completed, session_status
  FROM sessions
  WHERE id = NEW.session_id;

  IF session_completed IS NULL THEN
    RAISE EXCEPTION 'Session not found';
  END IF;

  IF session_status = 'cancelled' THEN
    RAISE EXCEPTION 'Cancelled sessions cannot be rated';
  END IF;

  IF session_completed = false THEN
    RAISE EXCEPTION 'Cannot rate incomplete session';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
