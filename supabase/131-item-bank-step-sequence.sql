-- PROMPT 010/011: Step-trace diagnostic items for public try flow.
-- Run after 130-production-cleanup.sql

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS step_sequence jsonb;

COMMENT ON COLUMN public.item_bank.step_sequence IS
  'Ordered step-trace path for guest diagnostic. Authored offline, never generated live.';

CREATE INDEX IF NOT EXISTS idx_item_bank_step_trace_approved
  ON public.item_bank (skill_node_id)
  WHERE status = 'approved' AND step_sequence IS NOT NULL;
