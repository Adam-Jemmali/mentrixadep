-- PROMPT 004: Baseline for mastery grid rank_delta verdict (current vs last login).
-- Run after 124-guidance-verdict-materialized.sql

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS last_seen_state jsonb;

COMMENT ON COLUMN public.user_settings.last_seen_state IS
  'Verdict Engine baseline: { accuracyPercent, percentile, verifiedCount, recordedAt } updated on mastery grid load.';
