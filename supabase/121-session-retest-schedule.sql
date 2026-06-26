-- Studio publish schedules post-session retests 48h out (closes loop to mastery grid + GIS).
-- Run after 120-skill-node-weekly-demand.sql

ALTER TABLE public.session_target_nodes
  ADD COLUMN IF NOT EXISTS retest_scheduled_at timestamptz;

CREATE UNIQUE INDEX IF NOT EXISTS idx_session_target_nodes_session_skill
  ON public.session_target_nodes (session_id, skill_node_id);

CREATE INDEX IF NOT EXISTS idx_session_target_nodes_retest_due
  ON public.session_target_nodes (session_id, retest_scheduled_at)
  WHERE post_session_checked_at IS NULL;

COMMENT ON COLUMN public.session_target_nodes.retest_scheduled_at IS
  'When the learner post-session retest unlocks (set on Studio package publish, typically +48h).';
