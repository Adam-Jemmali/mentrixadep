-- PROMPT 002: Trace duel questions back to reviewed item_bank rows.
-- Run after 133-xp-rls-lockdown.sql

ALTER TABLE public.skill_duels
  ADD COLUMN IF NOT EXISTS item_bank_ids uuid[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.skill_duels.item_bank_ids IS
  'Ordered item_bank ids for the active duel question pack; empty until activation.';
