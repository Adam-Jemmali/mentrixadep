-- Difficulty progression engine per student per skill node.
-- Spec asked for 139-challenge-difficulty.sql; 139 is taken by session-credits.
-- Run after 157-symbolic-grading-cache.sql

CREATE TABLE IF NOT EXISTS public.challenge_difficulty_state (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  current_difficulty_rating numeric(6, 2) NOT NULL DEFAULT 1000,
  consecutive_correct int NOT NULL DEFAULT 0,
  consecutive_incorrect int NOT NULL DEFAULT 0,
  last_updated timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_challenge_difficulty_state_user
  ON public.challenge_difficulty_state (user_id);

CREATE INDEX IF NOT EXISTS idx_challenge_difficulty_state_node
  ON public.challenge_difficulty_state (skill_node_id);

COMMENT ON TABLE public.challenge_difficulty_state IS
  'Hidden Elo-style practice difficulty per student per skill node. Never shown in UI.';

COMMENT ON COLUMN public.challenge_difficulty_state.current_difficulty_rating IS
  'Adaptive target rating. Item bank selection prefers nearby difficulty_rating values.';

ALTER TABLE public.challenge_difficulty_state ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.challenge_difficulty_state FROM PUBLIC;
GRANT SELECT, INSERT, UPDATE ON TABLE public.challenge_difficulty_state TO authenticated;
GRANT ALL ON TABLE public.challenge_difficulty_state TO service_role;

DROP POLICY IF EXISTS challenge_difficulty_state_read_own ON public.challenge_difficulty_state;
CREATE POLICY challenge_difficulty_state_read_own
  ON public.challenge_difficulty_state
  FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS challenge_difficulty_state_insert_own ON public.challenge_difficulty_state;
CREATE POLICY challenge_difficulty_state_insert_own
  ON public.challenge_difficulty_state
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS challenge_difficulty_state_update_own ON public.challenge_difficulty_state;
CREATE POLICY challenge_difficulty_state_update_own
  ON public.challenge_difficulty_state
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS challenge_difficulty_state_service_role_all ON public.challenge_difficulty_state;
CREATE POLICY challenge_difficulty_state_service_role_all
  ON public.challenge_difficulty_state
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');
