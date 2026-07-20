-- Phoenix slump tracking for practice recovery XP.
-- Never edit prior migrations.

CREATE TABLE IF NOT EXISTS public.skill_phoenix_slumps (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  consecutive_incorrect integer NOT NULL DEFAULT 0,
  slump_pending boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_skill_phoenix_slumps_user_pending
  ON public.skill_phoenix_slumps (user_id)
  WHERE slump_pending = true;

ALTER TABLE public.skill_phoenix_slumps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS skill_phoenix_slumps_select_own ON public.skill_phoenix_slumps;
CREATE POLICY skill_phoenix_slumps_select_own ON public.skill_phoenix_slumps
  FOR SELECT
  USING (auth.uid() = user_id);

-- Writes via service role / server actions only.

COMMENT ON TABLE public.skill_phoenix_slumps IS
  'Tracks consecutive practice misses for Phoenix recovery XP. Server writes only.';
