-- Passport identity fields on public rank card (optional, owner-editable later).
-- Run after 180-peer-cohort-size.sql

ALTER TABLE public.user_settings
  ADD COLUMN IF NOT EXISTS passport_sex text,
  ADD COLUMN IF NOT EXISTS passport_signature text;

ALTER TABLE public.user_settings
  DROP CONSTRAINT IF EXISTS user_settings_passport_sex_check;

ALTER TABLE public.user_settings
  ADD CONSTRAINT user_settings_passport_sex_check CHECK (
    passport_sex IS NULL OR passport_sex IN ('feminine', 'masculine')
  );

COMMENT ON COLUMN public.user_settings.passport_sex IS
  'Optional passport sex line: feminine or masculine.';

COMMENT ON COLUMN public.user_settings.passport_signature IS
  'Optional passport signature line. Falls back to display name when unset.';
