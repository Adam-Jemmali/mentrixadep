-- Introduce a single access-status column for app routing logic.
-- Keep legacy `approved` for backward compatibility while code migrates.

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS status TEXT;

-- Ensure allowed values for status.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_status_check'
  ) THEN
    ALTER TABLE users
      ADD CONSTRAINT users_status_check
      CHECK (status IN ('pending', 'approved', 'suspended'));
  END IF;
END
$$;

-- Backfill from legacy booleans when status is missing.
UPDATE users
SET status = CASE
  WHEN COALESCE(is_blacklisted, false) THEN 'suspended'
  WHEN approved THEN 'approved'
  ELSE 'pending'
END
WHERE status IS NULL;

ALTER TABLE users
  ALTER COLUMN status SET DEFAULT 'pending',
  ALTER COLUMN status SET NOT NULL;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
