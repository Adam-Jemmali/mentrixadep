-- AP Calculus AB skill graph: canonical curriculum nodes per subject/unit.
-- Run after 103-division-hub-rpc.sql

CREATE TABLE IF NOT EXISTS public.skill_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  unit_number int NOT NULL,
  unit_name text NOT NULL,
  node_name text NOT NULL,
  node_slug text NOT NULL,
  description text,
  prerequisites uuid[] DEFAULT '{}',
  common_misconceptions text[] DEFAULT '{}',
  display_order int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (subject, node_slug)
);

CREATE INDEX IF NOT EXISTS idx_skill_nodes_subject
  ON public.skill_nodes (subject);

ALTER TABLE public.skill_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_nodes_read ON public.skill_nodes;
CREATE POLICY skill_nodes_read ON public.skill_nodes
  FOR SELECT USING (true);

COMMENT ON TABLE public.skill_nodes IS
  'Canonical skill nodes for curriculum graphs (AP Calculus AB and future subjects).';
