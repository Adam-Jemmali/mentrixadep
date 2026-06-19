-- Breakthrough loop: skill nodes targeted for a Guide session (pre/post re-test).
-- Run after 110-telemetry-logs.sql

CREATE TABLE IF NOT EXISTS public.session_target_nodes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.sessions (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  pre_session_correct boolean,
  post_session_correct boolean,
  post_session_checked_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_session_target_nodes_session
  ON public.session_target_nodes (session_id);

CREATE INDEX IF NOT EXISTS idx_session_target_nodes_skill_node
  ON public.session_target_nodes (skill_node_id);

ALTER TABLE public.session_target_nodes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS stn_read ON public.session_target_nodes;
CREATE POLICY stn_read ON public.session_target_nodes
  FOR SELECT USING (
    session_id IN (
      SELECT id FROM public.sessions
      WHERE student_id = auth.uid()
         OR tutor_id = auth.uid()
    )
  );

COMMENT ON TABLE public.session_target_nodes IS
  'AP Calculus AB breakthrough targets: weakest skill nodes for a Guide session pre/post check.';

COMMENT ON COLUMN public.session_target_nodes.pre_session_correct IS
  'First attempt result on the pre-session diagnostic item for this node.';

COMMENT ON COLUMN public.session_target_nodes.post_session_correct IS
  'First attempt result on the post-session re-test item for this node.';
