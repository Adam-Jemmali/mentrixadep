-- P#025: VFA proof streak (consecutive calendar days with a new verified first attempt).
-- 143 is momentum pack credits — do not reuse that number.

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS vfa_streak_days integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS vfa_streak_last_date date,
  ADD COLUMN IF NOT EXISTS vfa_streak_longest integer NOT NULL DEFAULT 0;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_vfa_streak_days_nonneg;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_vfa_streak_days_nonneg
  CHECK (vfa_streak_days >= 0);

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_vfa_streak_longest_nonneg;
ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_vfa_streak_longest_nonneg
  CHECK (vfa_streak_longest >= 0);

COMMENT ON COLUMN public.user_settings.vfa_streak_days IS
  'Consecutive local days with at least one new verified_first_attempts insert. Not a login streak.';
COMMENT ON COLUMN public.user_settings.vfa_streak_last_date IS
  'Local calendar date (user timezone) of the last VFA that counted toward the streak.';
COMMENT ON COLUMN public.user_settings.vfa_streak_longest IS
  'Longest VFA proof streak ever recorded for this user.';
