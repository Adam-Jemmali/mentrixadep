-- Per-user session hide flags for history cleanup.
-- Hiding is non-destructive: it should not remove shared tutor/student records.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS student_hidden_at TIMESTAMPTZ NULL,
  ADD COLUMN IF NOT EXISTS tutor_hidden_at TIMESTAMPTZ NULL;

COMMENT ON COLUMN sessions.student_hidden_at IS
  'When set, the student hid this session from their own history list only.';

COMMENT ON COLUMN sessions.tutor_hidden_at IS
  'When set, the tutor hid this session from their own history list only.';

CREATE INDEX IF NOT EXISTS idx_sessions_student_visible_past
  ON sessions (student_id, end_time DESC)
  WHERE student_hidden_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_tutor_visible_past
  ON sessions (tutor_id, end_time DESC)
  WHERE tutor_hidden_at IS NULL;
