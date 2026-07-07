-- PROMPT 009 (Sprint 3): Live Arena Board event feed — public verified-first-attempt stream.
-- Run after 146-comp-member-session-credits.sql
--
-- display_name is computed at insert time (user_settings.display_name or anonymized alias).
-- Rows older than 48 hours are purged by the production cleanup cron; no separate job.

CREATE TABLE IF NOT EXISTS public.live_board_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid NOT NULL REFERENCES public.users (id),
  display_name text NOT NULL,
  skill_node_id uuid REFERENCES public.skill_nodes (id),
  node_name text NOT NULL,
  unit_name text NOT NULL,
  accuracy_pct numeric(5, 2),
  new_rank_tier text,
  is_first_attempt boolean NOT NULL DEFAULT false,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_live_board_occurred
  ON public.live_board_events (occurred_at DESC);

COMMENT ON TABLE public.live_board_events IS
  'Public live feed of verified first-attempt events for the Arena Board. 48h retention.';

COMMENT ON COLUMN public.live_board_events.display_name IS
  'user_settings.display_name when set; otherwise first email letter plus random 4-digit suffix at insert. Never the real email.';

ALTER TABLE public.live_board_events ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON TABLE public.live_board_events FROM PUBLIC;
GRANT SELECT ON TABLE public.live_board_events TO anon, authenticated;
GRANT ALL ON TABLE public.live_board_events TO service_role;

DROP POLICY IF EXISTS live_board_public_read ON public.live_board_events;
CREATE POLICY live_board_public_read
  ON public.live_board_events
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS live_board_service_insert ON public.live_board_events;
CREATE POLICY live_board_service_insert
  ON public.live_board_events
  FOR INSERT
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
