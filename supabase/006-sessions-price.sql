-- Add price_per_session to sessions (stored in cents, from availability at booking time)
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS price_per_session INTEGER;

-- Backfill existing sessions with default $25 (2500 cents) so revenue displays
UPDATE sessions SET price_per_session = 2500 WHERE price_per_session IS NULL;

-- Update auto-approve trigger to include price when creating session
CREATE OR REPLACE FUNCTION handle_auto_approve_session_request()
RETURNS TRIGGER AS $$
DECLARE
  tutor_auto_approve BOOLEAN; tutor_approved BOOLEAN;
  existing_tutor_session_id UUID; existing_student_session_id UUID;
  avail_start_time TIMESTAMPTZ; avail_end_time TIMESTAMPTZ; avail_course TEXT;
  avail_price INTEGER;
BEGIN
  IF NEW.status != 'pending' THEN RETURN NEW; END IF;
  SELECT auto_approve, approved INTO tutor_auto_approve, tutor_approved FROM users WHERE id = NEW.tutor_id;
  IF tutor_auto_approve = true AND tutor_approved = true THEN
    SELECT start_time, end_time, course, COALESCE(price_per_session, 2500) INTO avail_start_time, avail_end_time, avail_course, avail_price
    FROM availability WHERE id = NEW.availability_id;
    IF avail_start_time IS NULL THEN RETURN NEW; END IF;
    SELECT id INTO existing_tutor_session_id FROM sessions WHERE tutor_id = NEW.tutor_id AND start_time = avail_start_time LIMIT 1;
    SELECT id INTO existing_student_session_id FROM sessions WHERE student_id = NEW.student_id AND start_time = avail_start_time LIMIT 1;
    IF existing_tutor_session_id IS NULL AND existing_student_session_id IS NULL THEN
      INSERT INTO sessions (student_id, tutor_id, course, start_time, end_time, completed, price_per_session)
      VALUES (NEW.student_id, NEW.tutor_id, avail_course, avail_start_time, avail_end_time, false, avail_price);
      DELETE FROM availability WHERE id = NEW.availability_id;
      UPDATE session_requests SET status = 'approved', updated_at = NOW() WHERE id = NEW.id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
