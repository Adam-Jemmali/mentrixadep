-- Wire student knowledge graph to canonical skill_nodes (AP Calculus AB).
-- Run after 106-quest-topic-tags-skill-node.sql

ALTER TABLE public.student_knowledge_nodes
  ADD COLUMN IF NOT EXISTS skill_node_id uuid REFERENCES public.skill_nodes (id);

ALTER TABLE public.student_knowledge_nodes
  ADD COLUMN IF NOT EXISTS first_attempt_correct boolean;

CREATE INDEX IF NOT EXISTS idx_student_knowledge_skill_node
  ON public.student_knowledge_nodes (skill_node_id);

CREATE UNIQUE INDEX IF NOT EXISTS skn_user_skill_node_unique
  ON public.student_knowledge_nodes (user_id, skill_node_id)
  WHERE skill_node_id IS NOT NULL;

COMMENT ON COLUMN public.student_knowledge_nodes.skill_node_id IS
  'Canonical skill_nodes.id for AP Calculus AB mastery tracking.';

COMMENT ON COLUMN public.student_knowledge_nodes.first_attempt_correct IS
  'Whether the first recorded attempt on this skill node was correct. Set once, never overwritten.';

CREATE OR REPLACE FUNCTION public.get_weakest_nodes(
  p_user_id uuid,
  p_subject text,
  p_limit int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  subject text,
  unit_number int,
  unit_name text,
  node_name text,
  node_slug text,
  display_order int,
  accuracy_ratio numeric,
  attempts_count int,
  correct_count int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    sn.id,
    sn.subject,
    sn.unit_number,
    sn.unit_name,
    sn.node_name,
    sn.node_slug,
    sn.display_order,
    (skn.correct::numeric / skn.attempts::numeric) AS accuracy_ratio,
    skn.attempts AS attempts_count,
    skn.correct AS correct_count
  FROM public.student_knowledge_nodes skn
  INNER JOIN public.skill_nodes sn ON sn.id = skn.skill_node_id
  WHERE skn.user_id = p_user_id
    AND sn.subject = p_subject
    AND skn.attempts > 0
  ORDER BY (skn.correct::numeric / skn.attempts::numeric) ASC, skn.attempts DESC
  LIMIT GREATEST(1, LEAST(COALESCE(p_limit, 10), 50));
$$;

COMMENT ON FUNCTION public.get_weakest_nodes(uuid, text, int) IS
  'Returns skill_nodes for a student ordered by lowest correct/attempts ratio (AP Calc AB adaptive targeting).';

GRANT EXECUTE ON FUNCTION public.get_weakest_nodes(uuid, text, int) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_weakest_nodes(uuid, text, int) TO service_role;
