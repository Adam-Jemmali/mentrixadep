-- Weekly Mastery Grid snapshots for Momentum history (P1B).
-- Run after 139-session-credits.sql

CREATE TABLE IF NOT EXISTS public.mastery_grid_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  snapshot_week date NOT NULL,
  node_states jsonb NOT NULL DEFAULT '{}'::jsonb,
  rolling_accuracy jsonb NOT NULL DEFAULT '{}'::jsonb,
  verified_count smallint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mastery_grid_snapshots_user_week UNIQUE (user_id, snapshot_week)
);

CREATE INDEX IF NOT EXISTS idx_mastery_grid_snapshots_user_week
  ON public.mastery_grid_snapshots (user_id, snapshot_week DESC);

ALTER TABLE public.mastery_grid_snapshots ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mastery_grid_snapshots_read_own ON public.mastery_grid_snapshots;
CREATE POLICY mastery_grid_snapshots_read_own ON public.mastery_grid_snapshots
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mastery_grid_snapshots_service ON public.mastery_grid_snapshots;
CREATE POLICY mastery_grid_snapshots_service ON public.mastery_grid_snapshots
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.mastery_grid_snapshots IS
  'Weekly UTC Monday snapshots of Mastery Grid node states for Momentum timeline history.';
