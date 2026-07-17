-- P#032 Mastery decay alerts before review window expires.
-- Prompt said 147; that file is live-arena-board — use 168.

CREATE TABLE IF NOT EXISTS public.mastery_decay_alerts (
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  skill_node_id uuid NOT NULL REFERENCES public.skill_nodes (id) ON DELETE CASCADE,
  current_state text NOT NULL,
  hours_until_decay int NOT NULL CHECK (hours_until_decay >= 0),
  alert_sent_at timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, skill_node_id)
);

CREATE INDEX IF NOT EXISTS idx_mastery_decay_alerts_sent
  ON public.mastery_decay_alerts (alert_sent_at);

ALTER TABLE public.mastery_decay_alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS mastery_decay_alerts_read_own ON public.mastery_decay_alerts;
CREATE POLICY mastery_decay_alerts_read_own ON public.mastery_decay_alerts
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS mastery_decay_alerts_service ON public.mastery_decay_alerts;
CREATE POLICY mastery_decay_alerts_service ON public.mastery_decay_alerts
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.mastery_decay_alerts IS
  'Pre-decay mastery warnings. Push fires when next_review_at is within 24h and alert is due.';
