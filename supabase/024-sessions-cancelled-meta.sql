-- Track when and who cancelled a session (late-cancel alerts + analytics).
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cancelled_by_role TEXT;
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_cancelled_by_role_check;
ALTER TABLE sessions ADD CONSTRAINT sessions_cancelled_by_role_check CHECK (
  cancelled_by_role IS NULL OR cancelled_by_role IN ('student', 'tutor', 'admin')
);
