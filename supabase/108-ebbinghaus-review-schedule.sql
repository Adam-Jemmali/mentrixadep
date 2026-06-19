-- Ebbinghaus spaced review scheduling for AP Calculus AB skill nodes.
-- Run after 107-knowledge-graph-link.sql

ALTER TABLE public.student_knowledge_nodes
  ADD COLUMN IF NOT EXISTS next_review_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_student_knowledge_next_review
  ON public.student_knowledge_nodes (user_id, next_review_at)
  WHERE next_review_at IS NOT NULL;

COMMENT ON COLUMN public.student_knowledge_nodes.next_review_at IS
  'When this skill node should be re-surfaced after memory decay (AP Calculus AB).';
