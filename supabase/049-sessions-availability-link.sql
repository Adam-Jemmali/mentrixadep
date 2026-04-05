-- Link confirmed sessions back to the original availability slot.
-- This lets cancellation/refund flows unlock the source slot reliably.

ALTER TABLE sessions
  ADD COLUMN IF NOT EXISTS availability_id UUID REFERENCES availability(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_availability_id
  ON sessions (availability_id);

COMMENT ON COLUMN sessions.availability_id IS
  'Source availability slot for the confirmed session; used for cancellation unlock and audit.';