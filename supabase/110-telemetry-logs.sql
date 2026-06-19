-- Biometric telemetry logs for AP Calculus AB quest sessions (soft Guide context signal).
-- Run after 109-verified-first-attempt.sql

CREATE TABLE IF NOT EXISTS public.telemetry_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  quest_id uuid REFERENCES public.quests (id) ON DELETE SET NULL,
  keystroke_flight_variance float DEFAULT 0.0,
  focus_leak_count int DEFAULT 0,
  computed_friction_score float DEFAULT 1.0,
  is_anomaly_detected boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_telemetry_user
  ON public.telemetry_logs (user_id);

CREATE INDEX IF NOT EXISTS idx_telemetry_user_created
  ON public.telemetry_logs (user_id, created_at DESC);

ALTER TABLE public.telemetry_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS telemetry_read_own ON public.telemetry_logs;
CREATE POLICY telemetry_read_own ON public.telemetry_logs
  FOR SELECT USING (auth.uid() = user_id);

COMMENT ON TABLE public.telemetry_logs IS
  'Soft biometric quest telemetry for Guide pre-session context. Never used for penalties.';
