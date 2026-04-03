-- Security hardening foundation
-- - Sliding window rate limiter store
-- - COPPA age confirmation fields
-- - Recording consent metadata

CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  rate_key TEXT NOT NULL,
  bucket_start TIMESTAMPTZ NOT NULL,
  hit_count INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (rate_key, bucket_start)
);

CREATE INDEX IF NOT EXISTS security_rate_limits_updated_idx
  ON public.security_rate_limits(updated_at DESC);

-- Age gate confirmation for accounts
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS age_confirmed_13_or_older BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS age_confirmed_at TIMESTAMPTZ;

-- Recording consent evidence (both parties agreed before tutor uploaded recording)
ALTER TABLE public.video_recordings
  ADD COLUMN IF NOT EXISTS recording_consent_confirmed BOOLEAN NOT NULL DEFAULT FALSE;

COMMENT ON TABLE public.security_rate_limits IS
  'Supabase-backed sliding-window counters for security rate limiting.';
COMMENT ON COLUMN public.users.age_confirmed_13_or_older IS
  'COPPA gate: user self-confirmed age 13+ during signup.';
COMMENT ON COLUMN public.video_recordings.recording_consent_confirmed IS
  'Tutor confirmed both parties explicitly agreed to recording.';
