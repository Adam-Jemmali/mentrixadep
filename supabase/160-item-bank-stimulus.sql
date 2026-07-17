-- Structured stimulus for quest items: tables and function graphs.
-- Run after 159-vfa-free-response-weight.sql
-- Markdown pipe tables in prompt remain supported.

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS stimulus jsonb;

COMMENT ON COLUMN public.item_bank.stimulus IS
  'Optional array of stimulus blocks: table | function_graph. Rendered above the prompt in quest.';
