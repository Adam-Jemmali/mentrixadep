-- P#036 Annual Mentrixa Wrapped reports.
-- Prompt said 149; that number is taken — use 170.
-- Generated Dec 15 UTC for users with 30+ days of activity.

CREATE TABLE IF NOT EXISTS public.wrapped_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users (id) ON DELETE CASCADE,
  report_year int NOT NULL,
  role text NOT NULL CHECK (role IN ('student', 'tutor')),
  report_data jsonb NOT NULL,
  image_url text,
  share_token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  generated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_year)
);

CREATE INDEX IF NOT EXISTS idx_wrapped_reports_user_year
  ON public.wrapped_reports (user_id, report_year DESC);

CREATE INDEX IF NOT EXISTS idx_wrapped_reports_share_token
  ON public.wrapped_reports (share_token);

ALTER TABLE public.wrapped_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS wrapped_reports_owner_read ON public.wrapped_reports;
CREATE POLICY wrapped_reports_owner_read ON public.wrapped_reports
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS wrapped_reports_service ON public.wrapped_reports;
CREATE POLICY wrapped_reports_service ON public.wrapped_reports
  FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

COMMENT ON TABLE public.wrapped_reports IS
  'Annual Wrapped. Deterministic. Share via share_token only.';
