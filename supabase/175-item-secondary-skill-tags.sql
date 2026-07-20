-- Secondary skill tags on reviewed item bank rows.
-- Never edit prior migrations.

ALTER TABLE public.item_bank
  ADD COLUMN IF NOT EXISTS secondary_skill_tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.item_bank.secondary_skill_tags IS
  'Reviewed sub-skill slugs (e.g. chain-rule-basics). Used to route practice to the failure cause, not live AI.';

CREATE INDEX IF NOT EXISTS idx_item_bank_secondary_skill_tags
  ON public.item_bank
  USING GIN (secondary_skill_tags);
