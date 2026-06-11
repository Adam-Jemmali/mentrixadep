-- Security event log for honeypot hits, rate-limit violations, webhook failures, etc.

CREATE TABLE IF NOT EXISTS public.security_events (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type  text        NOT NULL,
  user_id     uuid        REFERENCES public.users(id) ON DELETE SET NULL,
  ip_address  text,
  metadata    jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS security_events_event_type_idx
  ON public.security_events (event_type, created_at DESC);

CREATE INDEX IF NOT EXISTS security_events_created_at_idx
  ON public.security_events (created_at DESC);

COMMENT ON TABLE public.security_events IS
  'Operational security telemetry — honeypot probes, rate-limit violations, webhook failures.';

ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.security_events FROM anon;
GRANT SELECT ON TABLE public.security_events TO authenticated;

DROP POLICY IF EXISTS "security_events_admin_read" ON public.security_events;
CREATE POLICY "security_events_admin_read"
  ON public.security_events
  FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "security_events_service_write" ON public.security_events;
CREATE POLICY "security_events_service_write"
  ON public.security_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
