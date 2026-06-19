-- Link quest attempts to canonical skill nodes (AP Calculus AB item bank).
-- Run after 105-item-bank.sql

ALTER TABLE public.quest_topic_tags
  ADD COLUMN IF NOT EXISTS skill_node_id uuid REFERENCES public.skill_nodes (id);

CREATE INDEX IF NOT EXISTS idx_quest_topic_tags_skill_node
  ON public.quest_topic_tags (skill_node_id);

COMMENT ON COLUMN public.quest_topic_tags.skill_node_id IS
  'Canonical skill_nodes.id when quest item came from item_bank (AP Calculus AB).';
