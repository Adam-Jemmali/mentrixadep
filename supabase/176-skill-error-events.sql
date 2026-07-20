-- Durable failure tags from practice / diagnostic wrong answers.
-- Never edit prior migrations.

CREATE TABLE IF NOT EXISTS public.skill_error_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  item_id uuid REFERENCES public.item_bank (id) ON DELETE SET NULL,
  failure_tag text,
  secondary_tags text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_skill_error_events_user_created
  ON public.skill_error_events (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_skill_error_events_user_node
  ON public.skill_error_events (user_id, skill_node_id);

CREATE INDEX IF NOT EXISTS idx_skill_error_events_secondary_tags
  ON public.skill_error_events
  USING GIN (secondary_tags);

ALTER TABLE public.skill_error_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_error_events_select_own ON public.skill_error_events;
CREATE POLICY skill_error_events_select_own ON public.skill_error_events
  FOR SELECT
  USING (auth.uid() = user_id);

-- Writes via service role / server actions only (no INSERT policy for authenticated).

COMMENT ON TABLE public.skill_error_events IS
  'Wrong-answer failure tags for AP Calc skill routing. Reviewed tags only.';
