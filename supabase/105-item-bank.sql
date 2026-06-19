-- AP Calculus AB pre generated quest items linked to skill nodes.
-- Run after 104-skill-nodes.sql

CREATE TABLE IF NOT EXISTS public.item_bank (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id),
  question_type text NOT NULL DEFAULT 'mcq',
  prompt text NOT NULL,
  options jsonb,
  correct_answer text NOT NULL,
  explanation text NOT NULL,
  distractor_tags jsonb DEFAULT '{}',
  difficulty_rating numeric(4, 2) DEFAULT 1000,
  status text NOT NULL DEFAULT 'pending_review',
  reviewed_by text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now()
);

-- question_type: mcq only for now
-- options: array of 4 strings for mcq
-- correct_answer: matches one option exactly
-- distractor_tags: maps each wrong option to a misconception string from skill_nodes
-- difficulty_rating: 1000 Elo baseline, updated later
-- status: pending_review, approved, or rejected

CREATE INDEX IF NOT EXISTS idx_item_bank_node
  ON public.item_bank (skill_node_id);

CREATE INDEX IF NOT EXISTS idx_item_bank_status
  ON public.item_bank (status);

ALTER TABLE public.item_bank ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS item_bank_read_approved ON public.item_bank;
CREATE POLICY item_bank_read_approved ON public.item_bank
  FOR SELECT USING (status = 'approved');

COMMENT ON TABLE public.item_bank IS
  'Pre generated AP Calculus AB items awaiting review; approved rows are student visible.';
